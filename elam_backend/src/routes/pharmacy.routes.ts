import { Router } from 'express';
import { PharmacyController } from '../controllers/pharmacy.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { Role } from '../types/enums.js';
import {
  updateDutyStatusSchema,
  updateStockSchema,
  batchUpdateStockSchema,
  createMedicationSchema,
  createReservationSchema,
  updateReservationStatusSchema,
} from '../schemas/pharmacy.schema.js';

const router = Router();

/**
 * @openapi
 * /api/v1/pharmacies:
 *   get:
 *     summary: Rechercher des pharmacies (proximité GPS, de garde, conventionnées CNAMGS)
 *     tags: [Pharmacies & Médicaments]
 */
router.get('/', PharmacyController.listPharmacies);

/**
 * @openapi
 * /api/v1/pharmacies/medications/search:
 *   get:
 *     summary: Vérifier la disponibilité réelle d'un médicament dans les pharmacies
 *     tags: [Pharmacies & Médicaments]
 */
router.get('/medications/search', PharmacyController.searchMedications);

/**
 * @openapi
 * /api/v1/pharmacies/medications:
 *   post:
 *     summary: Ajouter un nouveau médicament au catalogue
 *     tags: [Pharmacies & Médicaments]
 */
router.post(
  '/medications',
  authenticate,
  authorize(Role.PHARMACY, Role.ADMIN),
  validateRequest(createMedicationSchema),
  PharmacyController.createMedication
);

/**
 * @openapi
 * /api/v1/pharmacies/duty-status:
 *   patch:
 *     summary: Mettre à jour le statut de garde de la pharmacie
 *     tags: [Pharmacies & Médicaments]
 */
router.patch(
  '/duty-status',
  authenticate,
  authorize(Role.PHARMACY),
  validateRequest(updateDutyStatusSchema),
  PharmacyController.updateDutyStatus
);

/**
 * @openapi
 * /api/v1/pharmacies/stock:
 *   put:
 *     summary: Mettre à jour la disponibilité d'un médicament avec horodatage
 *     tags: [Pharmacies & Médicaments]
 */
router.put(
  '/stock',
  authenticate,
  authorize(Role.PHARMACY),
  validateRequest(updateStockSchema),
  PharmacyController.updateStock
);

/**
 * @openapi
 * /api/v1/pharmacies/stock/batch:
 *   put:
 *     summary: Mise à jour en lot des stocks de médicaments
 *     tags: [Pharmacies & Médicaments]
 */
router.put(
  '/stock/batch',
  authenticate,
  authorize(Role.PHARMACY),
  validateRequest(batchUpdateStockSchema),
  PharmacyController.batchUpdateStock
);

/**
 * @openapi
 * /api/v1/pharmacies/reservations:
 *   post:
 *     summary: Réserver un médicament auprès d'une officine (Patient)
 *     tags: [Pharmacies & Médicaments]
 */
router.post(
  '/reservations',
  authenticate,
  authorize(Role.PATIENT),
  validateRequest(createReservationSchema),
  PharmacyController.createReservation
);

/**
 * @openapi
 * /api/v1/pharmacies/reservations:
 *   get:
 *     summary: Consulter les réservations reçues par l'officine
 *     tags: [Pharmacies & Médicaments]
 */
router.get(
  '/reservations',
  authenticate,
  authorize(Role.PHARMACY),
  PharmacyController.getPharmacyReservations
);

/**
 * @openapi
 * /api/v1/pharmacies/reservations/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'une réservation (Prête, Délivrée, Annulée)
 *     tags: [Pharmacies & Médicaments]
 */
router.patch(
  '/reservations/:id/status',
  authenticate,
  authorize(Role.PHARMACY),
  validateRequest(updateReservationStatusSchema),
  PharmacyController.updateReservationStatus
);

/**
 * @openapi
 * /api/v1/pharmacies/{id}:
 *   get:
 *     summary: Obtenir les détails et l'état des stocks d'une pharmacie
 *     tags: [Pharmacies & Médicaments]
 */
router.get('/:id', PharmacyController.getPharmacyById);

export default router;
