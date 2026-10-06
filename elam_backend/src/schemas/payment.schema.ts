import { z } from 'zod';

/**
 * Demande de paiement.
 *
 * Le montant et la remise CNAMGS ne figurent PLUS ici : ils sont calcules par
 * le serveur a partir du rendez-vous, de la reservation ou de la formule
 * d'abonnement. Le client ne peut donc plus choisir ce qu'il paie.
 */
export const initiatePaymentSchema = z.object({
  relatedTo: z.enum(['APPOINTMENT', 'RESERVATION', 'SUBSCRIPTION'], {
    errorMap: () => ({ message: 'Type de paiement invalide (APPOINTMENT, RESERVATION ou SUBSCRIPTION).' }),
  }),
  /** Identifiant du RDV / de la reservation, ou type de formule pour un abonnement. */
  relatedId: z.string().min(1, 'Reference du service a payer requise'),
  phone: z.string().min(8, 'Numero Mobile Money requis'),
  /** Facultatif : le serveur deduit l'operateur du numero et verifie la coherence. */
  operator: z.enum(['AIRTEL_MONEY', 'MOOV_MONEY']).optional(),
});

export const simulatePaymentSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED', 'PROCESSING']),
  reason: z.string().optional(),
});
