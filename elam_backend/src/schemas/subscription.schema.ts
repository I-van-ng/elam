import { z } from 'zod';
import { PlanType } from '../types/enums.js';

export const subscribePlanSchema = z.object({
  planType: z.nativeEnum(PlanType),
  autoRenew: z.boolean().default(true),
});
