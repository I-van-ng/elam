import { z } from 'zod';
import { StockStatus } from '../types/enums.js';

export const updateDutyStatusSchema = z.object({
  isOnDuty: z.boolean(),
  onDutyUntil: z.string().datetime().optional().nullable(),
});

export const updateStockSchema = z.object({
  medicationId: z.string().uuid(),
  status: z.nativeEnum(StockStatus),
  quantity: z.number().int().nonnegative().optional(),
  priceFcfa: z.number().int().positive().optional(),
});

export const batchUpdateStockSchema = z.object({
  stocks: z.array(
    z.object({
      medicationId: z.string().uuid(),
      status: z.nativeEnum(StockStatus),
      quantity: z.number().int().nonnegative().optional(),
      priceFcfa: z.number().int().positive().optional(),
    })
  ),
});

export const createMedicationSchema = z.object({
  name: z.string().min(2, 'Nom commercial requis'),
  genericName: z.string().min(2, 'DCI requise'),
  category: z.string().min(2, 'Catégorie requise'),
  form: z.string().min(2, 'Forme requise (ex: Comprimé, Sirop)'),
  dosage: z.string().min(2, 'Dosage requis (ex: 500mg, 1g)'),
  requiresPrescription: z.boolean().default(false),
  codeCnamgs: z.string().optional(),
  description: z.string().optional(),
});

export const createReservationSchema = z.object({
  pharmacyId: z.string().uuid(),
  medicationId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  prescriptionPhotoUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'READY', 'COLLECTED', 'CANCELLED']),
});
