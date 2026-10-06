import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { initiatePaymentSchema, simulatePaymentSchema } from '../schemas/payment.schema.js';

const router = Router();

/**
 * @openapi
 * /api/v1/payments/webhook/airtel:
 *   post:
 *     summary: Webhook Airtel Money — confirmation de transaction (appele par Airtel)
 *     tags: [Paiements Mobile Money]
 *     description: >
 *       Endpoint appele par Airtel des que le client a valide sur son telephone.
 *       Non authentifie par JWT : la requete est verifiee par signature
 *       (PAYMENT_WEBHOOK_SECRET). C'est la SEULE source de verite qui confirme un paiement.
 */
router.post('/webhook/airtel', PaymentController.webhookAirtel);

/**
 * @openapi
 * /api/v1/payments/webhook/moov:
 *   post:
 *     summary: Webhook Moov Money — confirmation de transaction (appele par Moov)
 *     tags: [Paiements Mobile Money]
 */
router.post('/webhook/moov', PaymentController.webhookMoov);

/**
 * @openapi
 * /api/v1/payments/webhook/sandbox:
 *   post:
 *     summary: Webhook de simulation (developpement uniquement)
 *     tags: [Paiements Mobile Money]
 */
router.post('/webhook/sandbox', PaymentController.webhookSandbox);

/**
 * @openapi
 * /api/v1/payments/sandbox/simulate/{transactionRef}:
 *   post:
 *     summary: Forcer l'etat d'un paiement simule (developpement uniquement)
 *     tags: [Paiements Mobile Money]
 */
router.post(
  '/sandbox/simulate/:transactionRef',
  authenticate,
  validateRequest(simulatePaymentSchema),
  PaymentController.sandboxSimulate
);

/**
 * @openapi
 * /api/v1/payments/initiate:
 *   post:
 *     summary: Demarrer un paiement Mobile Money (le montant est calcule par le serveur)
 *     tags: [Paiements Mobile Money]
 *     security:
 *       - bearerAuth: []
 */
router.post('/initiate', authenticate, validateRequest(initiatePaymentSchema), PaymentController.initiate);

/**
 * @openapi
 * /api/v1/payments/history:
 *   get:
 *     summary: Historique de VOS paiements
 *     tags: [Paiements Mobile Money]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', authenticate, PaymentController.history);

/**
 * @openapi
 * /api/v1/payments/verify/{transactionRef}:
 *   get:
 *     summary: Verifier l'etat d'un paiement (interroge l'operateur)
 *     tags: [Paiements Mobile Money]
 *     security:
 *       - bearerAuth: []
 */
router.get('/verify/:transactionRef', authenticate, PaymentController.verify);

export default router;
