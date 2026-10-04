import { prisma } from '../config/prisma.js';
import { calculateDistanceKm } from '../utils/distance.js';

export class DoctorService {
  static async listDoctors(filters: {
    specialty?: string;
    city?: string;
    district?: string;
    acceptsCnamgs?: boolean;
    acceptsTeleconsult?: boolean;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    search?: string;
  }) {
    const where: any = {};

    if (filters.specialty) {
      where.specialty = { contains: filters.specialty };
    }
    if (filters.city) {
      where.city = { contains: filters.city };
    }
    if (filters.district) {
      where.district = { contains: filters.district };
    }
    if (filters.acceptsCnamgs !== undefined) {
      where.acceptsCnamgs = filters.acceptsCnamgs;
    }
    if (filters.acceptsTeleconsult !== undefined) {
      where.acceptsTeleconsult = filters.acceptsTeleconsult;
    }
    if (filters.search) {
      where.OR = [
        { specialty: { contains: filters.search } },
        { subSpecialties: { contains: filters.search } },
        { user: { firstName: { contains: filters.search } } },
        { user: { lastName: { contains: filters.search } } },
      ];
    }

    const doctors = await prisma.doctorProfile.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true, phone: true },
        },
        availabilities: true,
      },
    });

    let results = doctors.map((doc) => {
      let distanceKm: number | null = null;
      if (filters.lat && filters.lng) {
        distanceKm = calculateDistanceKm(filters.lat, filters.lng, doc.latitude, doc.longitude);
      }
      return {
        ...doc,
        distanceKm,
      };
    });

    if (filters.lat && filters.lng) {
      if (filters.radiusKm) {
        results = results.filter((d) => d.distanceKm !== null && d.distanceKm <= filters.radiusKm!);
      }
      results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return results;
  }

  static async getDoctorById(id: string, userLat?: number, userLng?: number) {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true, email: true, phone: true },
        },
        availabilities: {
          orderBy: { dayOfWeek: 'asc' },
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

    if (!doctor) {
      throw new Error('Médecin introuvable');
    }

    let distanceKm: number | null = null;
    if (userLat && userLng) {
      distanceKm = calculateDistanceKm(userLat, userLng, doctor.latitude, doctor.longitude);
    }

    return {
      ...doctor,
      distanceKm,
    };
  }

  static async updateProfile(userId: string, data: any) {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new Error('Profil médecin non trouvé');
    }

    return await prisma.doctorProfile.update({
      where: { id: doctor.id },
      data,
    });
  }

  static async setAvailabilities(
    userId: string,
    availabilities: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes?: number;
      isAvailable?: boolean;
    }>
  ) {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new Error('Profil médecin non trouvé');
    }

    // Supprime les anciennes disponibilités et réinsère
    await prisma.doctorAvailability.deleteMany({
      where: { doctorId: doctor.id },
    });

    await prisma.doctorAvailability.createMany({
      data: availabilities.map((a) => ({
        doctorId: doctor.id,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        slotDurationMinutes: a.slotDurationMinutes ?? 30,
        isAvailable: a.isAvailable ?? true,
      })),
    });

    return await prisma.doctorAvailability.findMany({
      where: { doctorId: doctor.id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async toggleFavoriteDoctor(patientUserId: string, doctorId: string) {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientUserId },
    });

    if (!patient) {
      throw new Error('Profil patient introuvable');
    }

    const existing = await prisma.favoriteDoctor.findUnique({
      where: {
        patientId_doctorId: {
          patientId: patient.id,
          doctorId,
        },
      },
    });

    if (existing) {
      await prisma.favoriteDoctor.delete({
        where: { id: existing.id },
      });
      return { isFavorite: false, message: 'Médecin retiré de vos favoris' };
    } else {
      await prisma.favoriteDoctor.create({
        data: {
          patientId: patient.id,
          doctorId,
        },
      });
      return { isFavorite: true, message: 'Médecin ajouté à votre carnet de favoris' };
    }
  }

  static async getFavoriteDoctors(patientUserId: string) {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientUserId },
    });

    if (!patient) {
      throw new Error('Profil patient introuvable');
    }

    return await prisma.favoriteDoctor.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
    });
  }
}
