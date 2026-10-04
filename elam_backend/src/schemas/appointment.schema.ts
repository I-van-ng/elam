import { z } from 'zod';
import { AppointmentType, AppointmentStatus } from '../types/enums.js';

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date requis: YYYY-MM-DD'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format heure HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format heure HH:MM'),
  type: z.nativeEnum(AppointmentType).default(AppointmentType.IN_PERSON),
  reason: z.string().min(2, 'Motif de consultation requis'),
  patientNotes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  doctorNotes: z.string().optional(),
});
