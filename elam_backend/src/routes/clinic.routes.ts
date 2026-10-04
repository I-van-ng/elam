import { Router } from 'express';
import { ClinicController } from '../controllers/clinic.controller.js';

const router = Router();

/**
 * @openapi
 * /api/v1/clinics:
 *   get:
 *     summary: Rechercher des hôpitaux, polycliniques et centres d'urgences 24/7
 *     tags: [Établissements de Santé]
 */
router.get('/', ClinicController.listClinics);

/**
 * @openapi
 * /api/v1/clinics/{id}:
 *   get:
 *     summary: Détails d'un établissement de santé
 *     tags: [Établissements de Santé]
 */
router.get('/:id', ClinicController.getClinicById);

export default router;
