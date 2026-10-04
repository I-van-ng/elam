import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { subscribePlanSchema } from '../schemas/subscription.schema.js';

const router = Router();

/**
 * @openapi
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: Grille des tarifs et offres d'abonnements pros
 *     tags: [Abonnements & Monétisation]
 */
router.get('/plans', SubscriptionController.getPlans);

/**
 * @openapi
 * /api/v1/subscriptions/my:
 *   get:
 *     summary: Consulter son abonnement actif
 *     tags: [Abonnements & Monétisation]
 */
router.get('/my', authenticate, SubscriptionController.getMySubscription);

/**
 * @openapi
 * /api/v1/subscriptions/subscribe:
 *   post:
 *     summary: Souscrire à une formule d'abonnement pro
 *     tags: [Abonnements & Monétisation]
 */
router.post(
  '/subscribe',
  authenticate,
  validateRequest(subscribePlanSchema),
  SubscriptionController.subscribe
);

export default router;
