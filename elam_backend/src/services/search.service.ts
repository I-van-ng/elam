import { prisma } from '../config/prisma.js';
import { calculateDistanceKm } from '../utils/distance.js';
import { StockStatus } from '../types/enums.js';

export class SearchService {
  /**
   * Moteur "Waze de la Santé" : Recherche globale géolocalisée et agrégée
   * Répond au besoin : "Je suis à la maison, où puis-je être soigné / trouver mon médicament maintenant ?"
   */
  static async searchNearbyHealth(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    query?: string;
    filter?: 'ALL' | 'PHARMACIES' | 'DOCTORS' | 'EMERGENCY_CLINICS';
  }) {
    const { lat, lng, radiusKm = 15, query, filter = 'ALL' } = params;

    let pharmacies: any[] = [];
    let doctors: any[] = [];
    let emergencyClinics: any[] = [];
    let medicationsFound: any[] = [];

    // 1. Recherche Pharmacies & Stocks
    if (filter === 'ALL' || filter === 'PHARMACIES') {
      const allPharmacies = await prisma.pharmacyProfile.findMany({
        include: {
          stocks: {
            include: { medication: true },
          },
        },
      });

      pharmacies = allPharmacies
        .map((p) => {
          const distanceKm = calculateDistanceKm(lat, lng, p.latitude, p.longitude);
          
          // Vérifie si un médicament demandé correspond
          let matchingStock = null;
          if (query) {
            matchingStock = p.stocks.find(
              (s) =>
                s.medication.name.toLowerCase().includes(query.toLowerCase()) ||
                s.medication.genericName.toLowerCase().includes(query.toLowerCase())
            );
          }

          return {
            id: p.id,
            name: p.name,
            address: p.address,
            district: p.district,
            city: p.city,
            phone: p.phone,
            isOnDuty: p.isOnDuty,
            acceptsCnamgs: p.acceptsCnamgs,
            rating: p.rating,
            latitude: p.latitude,
            longitude: p.longitude,
            distanceKm,
            matchingStock: matchingStock
              ? {
                  medicationName: matchingStock.medication.name,
                  genericName: matchingStock.medication.genericName,
                  status: matchingStock.status,
                  priceFcfa: matchingStock.priceFcfa,
                  lastVerifiedAt: matchingStock.lastVerifiedAt,
                }
              : null,
          };
        })
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => {
          // Priorité aux pharmacies de garde puis à la distance
          if (a.isOnDuty && !b.isOnDuty) return -1;
          if (!a.isOnDuty && b.isOnDuty) return 1;
          return a.distanceKm - b.distanceKm;
        });
    }

    // 2. Recherche Médecins & Spécialistes
    if (filter === 'ALL' || filter === 'DOCTORS') {
      const allDoctors = await prisma.doctorProfile.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } },
          availabilities: true,
        },
      });

      doctors = allDoctors
        .map((d) => {
          const distanceKm = calculateDistanceKm(lat, lng, d.latitude, d.longitude);
          return {
            id: d.id,
            doctorName: `Dr. ${d.user.firstName} ${d.user.lastName}`,
            specialty: d.specialty,
            subSpecialties: d.subSpecialties,
            consultationFee: d.consultationFee,
            acceptsCnamgs: d.acceptsCnamgs,
            acceptsTeleconsult: d.acceptsTeleconsult,
            acceptsHomeVisit: d.acceptsHomeVisit,
            address: d.address,
            district: d.district,
            city: d.city,
            rating: d.rating,
            reviewCount: d.reviewCount,
            latitude: d.latitude,
            longitude: d.longitude,
            distanceKm,
            availabilities: d.availabilities,
          };
        })
        .filter((d) => {
          if (d.distanceKm > radiusKm) return false;
          if (query) {
            return (
              d.specialty.toLowerCase().includes(query.toLowerCase()) ||
              d.doctorName.toLowerCase().includes(query.toLowerCase()) ||
              (d.subSpecialties && d.subSpecialties.toLowerCase().includes(query.toLowerCase()))
            );
          }
          return true;
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // 3. Recherche Cliniques & Urgences 24/7
    if (filter === 'ALL' || filter === 'EMERGENCY_CLINICS') {
      const allClinics = await prisma.clinicProfile.findMany();

      emergencyClinics = allClinics
        .map((c) => {
          const distanceKm = calculateDistanceKm(lat, lng, c.latitude, c.longitude);
          return {
            id: c.id,
            name: c.name,
            type: c.type,
            address: c.address,
            district: c.district,
            city: c.city,
            phone: c.phone,
            emergencyPhone247: c.emergencyPhone247,
            hasEmergency247: c.hasEmergency247,
            acceptsCnamgs: c.acceptsCnamgs,
            services: c.services ? JSON.parse(c.services) : [],
            latitude: c.latitude,
            longitude: c.longitude,
            distanceKm,
          };
        })
        .filter((c) => c.distanceKm <= radiusKm)
        .sort((a, b) => {
          if (a.hasEmergency247 && !b.hasEmergency247) return -1;
          if (!a.hasEmergency247 && b.hasEmergency247) return 1;
          return a.distanceKm - b.distanceKm;
        });
    }

    return {
      searchCenter: { latitude: lat, longitude: lng, radiusKm },
      query: query || null,
      summary: {
        pharmaciesCount: pharmacies.length,
        onDutyPharmaciesCount: pharmacies.filter((p) => p.isOnDuty).length,
        doctorsCount: doctors.length,
        emergencyClinicsCount: emergencyClinics.length,
      },
      results: {
        pharmacies,
        doctors,
        emergencyClinics,
      },
    };
  }
}
