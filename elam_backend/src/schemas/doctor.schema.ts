import { z } from 'zod';

export const updateDoctorProfileSchema = z.object({
  specialty: z.string().optional(),
  subSpecialties: z.string().optional(),
  bio: z.string().optional(),
  consultationFee: z.number().int().nonnegative().optional(),
  acceptsCnamgs: z.boolean().optional(),
  acceptsTeleconsult: z.boolean().optional(),
  acceptsHomeVisit: z.boolean().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const setDoctorAvailabilitySchema = z.object({
  availabilities: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format heure HH:MM invalide'),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format heure HH:MM invalide'),
      slotDurationMinutes: z.number().int().positive().default(30),
      isAvailable: z.boolean().default(true),
    })
  ),
});
