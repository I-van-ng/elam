import { z } from 'zod';

export const pharmacySearchQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().default(20),
  city: z.string().optional(),
  isOnDuty: z.coerce.boolean().optional(),
  acceptsCnamgs: z.coerce.boolean().optional(),
  medicationName: z.string().optional(),
  search: z.string().optional(),
});

export const doctorSearchQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().default(25),
  specialty: z.string().optional(),
  city: z.string().optional(),
  acceptsCnamgs: z.coerce.boolean().optional(),
  acceptsTeleconsult: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const wazeHealthSearchSchema = z.object({
  lat: z.coerce.number({ required_error: 'Latitude requise pour la recherche de proximité' }),
  lng: z.coerce.number({ required_error: 'Longitude requise pour la recherche de proximité' }),
  radiusKm: z.coerce.number().default(15),
  query: z.string().optional(), // Medication name, Doctor specialty, or Symptom
  filter: z.enum(['ALL', 'PHARMACIES', 'DOCTORS', 'EMERGENCY_CLINICS']).default('ALL'),
});
