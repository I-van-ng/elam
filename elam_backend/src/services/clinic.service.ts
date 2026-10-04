import { prisma } from '../config/prisma.js';
import { calculateDistanceKm } from '../utils/distance.js';

export class ClinicService {
  static async listClinics(filters: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    city?: string;
    hasEmergency247?: boolean;
    acceptsCnamgs?: boolean;
    type?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters.city) {
      where.city = { contains: filters.city };
    }
    if (filters.hasEmergency247 !== undefined) {
      where.hasEmergency247 = filters.hasEmergency247;
    }
    if (filters.acceptsCnamgs !== undefined) {
      where.acceptsCnamgs = filters.acceptsCnamgs;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { district: { contains: filters.search } },
        { services: { contains: filters.search } },
      ];
    }

    const clinics = await prisma.clinicProfile.findMany({
      where,
    });

    let results = clinics.map((clinic) => {
      let distanceKm: number | null = null;
      if (filters.lat && filters.lng) {
        distanceKm = calculateDistanceKm(filters.lat, filters.lng, clinic.latitude, clinic.longitude);
      }
      return {
        ...clinic,
        distanceKm,
      };
    });

    if (filters.lat && filters.lng) {
      if (filters.radiusKm) {
        results = results.filter((c) => c.distanceKm !== null && c.distanceKm <= filters.radiusKm!);
      }
      results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return results;
  }

  static async getClinicById(id: string, userLat?: number, userLng?: number) {
    const clinic = await prisma.clinicProfile.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!clinic) {
      throw new Error('Établissement introuvable');
    }

    let distanceKm: number | null = null;
    if (userLat && userLng) {
      distanceKm = calculateDistanceKm(userLat, userLng, clinic.latitude, clinic.longitude);
    }

    return {
      ...clinic,
      distanceKm,
    };
  }
}
