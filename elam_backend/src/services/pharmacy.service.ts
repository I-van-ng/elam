import { prisma } from '../config/prisma.js';
import { calculateDistanceKm } from '../utils/distance.js';
import { StockStatus } from '../types/enums.js';

export class PharmacyService {
  static async listPharmacies(filters: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    city?: string;
    isOnDuty?: boolean;
    acceptsCnamgs?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (filters.city) {
      where.city = { contains: filters.city };
    }
    if (filters.isOnDuty !== undefined) {
      where.isOnDuty = filters.isOnDuty;
    }
    if (filters.acceptsCnamgs !== undefined) {
      where.acceptsCnamgs = filters.acceptsCnamgs;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { district: { contains: filters.search } },
        { address: { contains: filters.search } },
      ];
    }

    const pharmacies = await prisma.pharmacyProfile.findMany({
      where,
      include: {
        stocks: {
          include: { medication: true },
          take: 5,
        },
      },
    });

    let results = pharmacies.map((pharmacy) => {
      let distanceKm: number | null = null;
      if (filters.lat && filters.lng) {
        distanceKm = calculateDistanceKm(filters.lat, filters.lng, pharmacy.latitude, pharmacy.longitude);
      }
      return {
        ...pharmacy,
        distanceKm,
      };
    });

    if (filters.lat && filters.lng) {
      if (filters.radiusKm) {
        results = results.filter((p) => p.distanceKm !== null && p.distanceKm <= filters.radiusKm!);
      }
      results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return results;
  }

  static async getPharmacyById(id: string, userLat?: number, userLng?: number) {
    const pharmacy = await prisma.pharmacyProfile.findUnique({
      where: { id },
      include: {
        stocks: {
          include: { medication: true },
          orderBy: { medication: { name: 'asc' } },
        },
        reviews: {
          include: {
            author: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!pharmacy) {
      throw new Error('Pharmacie non trouvée');
    }

    let distanceKm: number | null = null;
    if (userLat && userLng) {
      distanceKm = calculateDistanceKm(userLat, userLng, pharmacy.latitude, pharmacy.longitude);
    }

    return {
      ...pharmacy,
      distanceKm,
    };
  }

  static async updateDutyStatus(userId: string, isOnDuty: boolean, onDutyUntil?: string | null) {
    const pharmacy = await prisma.pharmacyProfile.findUnique({
      where: { userId },
    });

    if (!pharmacy) {
      throw new Error('Profil pharmacie non trouvé pour cet utilisateur');
    }

    const updated = await prisma.pharmacyProfile.update({
      where: { id: pharmacy.id },
      data: {
        isOnDuty,
        onDutyUntil: onDutyUntil ? new Date(onDutyUntil) : null,
      },
    });

    return updated;
  }

  static async updateStock(
    userId: string,
    data: {
      medicationId: string;
      status: StockStatus;
      quantity?: number;
      priceFcfa?: number;
    }
  ) {
    const pharmacy = await prisma.pharmacyProfile.findUnique({
      where: { userId },
    });

    if (!pharmacy) {
      throw new Error('Profil pharmacie non trouvé');
    }

    const existingStock = await prisma.pharmacyStock.findUnique({
      where: {
        pharmacyId_medicationId: {
          pharmacyId: pharmacy.id,
          medicationId: data.medicationId,
        },
      },
    });

    if (existingStock) {
      return await prisma.pharmacyStock.update({
        where: { id: existingStock.id },
        data: {
          status: data.status,
          quantity: data.quantity ?? existingStock.quantity,
          priceFcfa: data.priceFcfa ?? existingStock.priceFcfa,
          lastVerifiedAt: new Date(),
        },
        include: { medication: true },
      });
    } else {
      return await prisma.pharmacyStock.create({
        data: {
          pharmacyId: pharmacy.id,
          medicationId: data.medicationId,
          status: data.status,
          quantity: data.quantity ?? 10,
          priceFcfa: data.priceFcfa ?? 3000,
          lastVerifiedAt: new Date(),
        },
        include: { medication: true },
      });
    }
  }

  static async batchUpdateStock(
    userId: string,
    items: Array<{
      medicationId: string;
      status: StockStatus;
      quantity?: number;
      priceFcfa?: number;
    }>
  ) {
    const pharmacy = await prisma.pharmacyProfile.findUnique({
      where: { userId },
    });

    if (!pharmacy) {
      throw new Error('Profil pharmacie non trouvé');
    }

    const results = [];
    for (const item of items) {
      const stock = await this.updateStock(userId, item);
      results.push(stock);
    }

    return results;
  }

  static async searchMedicationAvailability(
    query: string,
    options: {
      lat?: number;
      lng?: number;
      radiusKm?: number;
      city?: string;
      onlyInStock?: boolean;
    }
  ) {
    const medications = await prisma.medication.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { genericName: { contains: query } },
          { category: { contains: query } },
        ],
      },
      include: {
        stocks: {
          include: {
            pharmacy: true,
          },
        },
      },
    });

    const results: any[] = [];

    for (const med of medications) {
      const pharmacyOffers = med.stocks
        .filter((stock) => {
          if (options.onlyInStock && stock.status !== StockStatus.IN_STOCK && stock.status !== StockStatus.LOW_STOCK) {
            return false;
          }
          if (options.city && stock.pharmacy.city.toLowerCase() !== options.city.toLowerCase()) {
            return false;
          }
          return true;
        })
        .map((stock) => {
          let distanceKm: number | null = null;
          if (options.lat && options.lng) {
            distanceKm = calculateDistanceKm(options.lat, options.lng, stock.pharmacy.latitude, stock.pharmacy.longitude);
          }

          // Formatage de la fraîcheur du stock (ex: vérifié il y a 20 min)
          const minutesAgo = Math.floor((Date.now() - new Date(stock.lastVerifiedAt).getTime()) / (1000 * 60));
          let freshness = `Vérifié il y a ${minutesAgo} min`;
          if (minutesAgo < 1) freshness = 'Vérifié à l\'instant';
          else if (minutesAgo >= 60 && minutesAgo < 1440) freshness = `Vérifié il y a ${Math.floor(minutesAgo / 60)}h`;
          else if (minutesAgo >= 1440) freshness = `Vérifié il y a ${Math.floor(minutesAgo / 1440)}j`;

          return {
            pharmacyId: stock.pharmacy.id,
            pharmacyName: stock.pharmacy.name,
            address: stock.pharmacy.address,
            district: stock.pharmacy.district,
            city: stock.pharmacy.city,
            phone: stock.pharmacy.phone,
            isOnDuty: stock.pharmacy.isOnDuty,
            acceptsCnamgs: stock.pharmacy.acceptsCnamgs,
            stockStatus: stock.status,
            priceFcfa: stock.priceFcfa,
            quantity: stock.quantity,
            lastVerifiedAt: stock.lastVerifiedAt,
            freshness,
            distanceKm,
          };
        });

      if (options.lat && options.lng) {
        pharmacyOffers.sort((a, b) => {
          if (a.isOnDuty && !b.isOnDuty) return -1;
          if (!a.isOnDuty && b.isOnDuty) return 1;
          return (a.distanceKm || 0) - (b.distanceKm || 0);
        });
      }

      results.push({
        medication: {
          id: med.id,
          name: med.name,
          genericName: med.genericName,
          category: med.category,
          dosage: med.dosage,
          form: med.form,
          requiresPrescription: med.requiresPrescription,
          codeCnamgs: med.codeCnamgs,
        },
        availablePharmaciesCount: pharmacyOffers.filter((o) => o.stockStatus === StockStatus.IN_STOCK).length,
        offers: pharmacyOffers,
      });
    }

    return results;
  }

  static async listMedications(search?: string, category?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
      ];
    }
    if (category) {
      where.category = { contains: category };
    }

    return await prisma.medication.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  static async createMedication(data: {
    name: string;
    genericName: string;
    category: string;
    form: string;
    dosage: string;
    requiresPrescription?: boolean;
    codeCnamgs?: string;
    description?: string;
  }) {
    return await prisma.medication.create({
      data: {
        name: data.name,
        genericName: data.genericName,
        category: data.category,
        form: data.form,
        dosage: data.dosage,
        requiresPrescription: data.requiresPrescription ?? false,
        codeCnamgs: data.codeCnamgs,
        description: data.description,
      },
    });
  }

  static async createReservation(
    patientUserId: string,
    data: {
      pharmacyId: string;
      medicationId: string;
      quantity?: number;
      prescriptionPhotoUrl?: string;
      notes?: string;
    }
  ) {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientUserId },
    });

    if (!patient) {
      throw new Error('Profil patient non trouvé');
    }

    return await prisma.medicationReservation.create({
      data: {
        patientId: patient.id,
        pharmacyId: data.pharmacyId,
        medicationId: data.medicationId,
        quantity: data.quantity ?? 1,
        prescriptionPhotoUrl: data.prescriptionPhotoUrl,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        medication: true,
        pharmacy: true,
      },
    });
  }

  static async getPharmacyReservations(pharmacyUserId: string) {
    const pharmacy = await prisma.pharmacyProfile.findUnique({
      where: { userId: pharmacyUserId },
    });

    if (!pharmacy) {
      throw new Error('Profil pharmacie non trouvé');
    }

    return await prisma.medicationReservation.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        },
        medication: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateReservationStatus(
    pharmacyUserId: string,
    reservationId: string,
    status: string
  ) {
    const pharmacy = await prisma.pharmacyProfile.findUnique({
      where: { userId: pharmacyUserId },
    });

    if (!pharmacy) {
      throw new Error('Profil pharmacie non trouvé');
    }

    const reservation = await prisma.medicationReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation || reservation.pharmacyId !== pharmacy.id) {
      throw new Error('Réservation introuvable ou non autorisée');
    }

    return await prisma.medicationReservation.update({
      where: { id: reservationId },
      data: { status },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        },
        medication: true,
      },
    });
  }
}
