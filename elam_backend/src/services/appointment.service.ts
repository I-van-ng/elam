import { prisma } from '../config/prisma.js';
import { AppointmentStatus, AppointmentType } from '../types/enums.js';

export class AppointmentService {
  static async bookAppointment(
    patientUserId: string,
    data: {
      doctorId: string;
      appointmentDate: string; // YYYY-MM-DD
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      type: AppointmentType;
      reason: string;
      patientNotes?: string;
    }
  ) {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientUserId },
    });

    if (!patient) {
      throw new Error('Profil patient introuvable');
    }

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: data.doctorId },
    });

    if (!doctor) {
      throw new Error('Médecin sélectionné introuvable');
    }

    const appointmentDate = new Date(data.appointmentDate);

    // Vérifier les conflits de créneau
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        appointmentDate,
        startTime: data.startTime,
        status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
      },
    });

    if (conflict) {
      throw new Error('Ce créneau horaire est déjà réservé pour ce praticien.');
    }

    return await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        status: AppointmentStatus.REQUESTED,
        reason: data.reason,
        patientNotes: data.patientNotes,
        feeFcfa: doctor.consultationFee,
      },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
    });
  }

  static async getDoctorAppointments(doctorUserId: string, status?: string, date?: string) {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
    });

    if (!doctor) {
      throw new Error('Profil médecin introuvable');
    }

    const where: any = { doctorId: doctor.id };
    if (status) {
      where.status = status;
    }
    if (date) {
      where.appointmentDate = new Date(date);
    }

    return await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true, email: true } },
          },
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  static async getPatientAppointments(patientUserId: string) {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientUserId },
    });

    if (!patient) {
      throw new Error('Profil patient introuvable');
    }

    return await prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } },
          },
        },
      },
      orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
    });
  }

  static async updateAppointmentStatus(
    userId: string,
    appointmentId: string,
    status: AppointmentStatus,
    doctorNotes?: string
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: true,
        patient: true,
      },
    });

    if (!appointment) {
      throw new Error('Rendez-vous introuvable');
    }

    // Vérifier l'autorisation (Médecin ou Patient concerné)
    const isDoctor = appointment.doctor.userId === userId;
    const isPatient = appointment.patient.userId === userId;

    if (!isDoctor && !isPatient) {
      throw new Error('Accès non autorisé à ce rendez-vous');
    }

    return await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        doctorNotes: isDoctor && doctorNotes ? doctorNotes : undefined,
      },
      include: {
        doctor: {
          include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        },
        patient: {
          include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        },
      },
    });
  }
}
