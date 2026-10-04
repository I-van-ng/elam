import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';

const router = Router();

/**
 * @openapi
 * /api/v1/search/nearby:
 *   get:
 *     summary: "Moteur Waze Santé : Recherche unifiée et géolocalisée (Pharmacies de garde, Médecins, Urgences)"
 *     tags: [Waze Santé - Recherche Intelligente]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude GPS de l'utilisateur
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude GPS de l'utilisateur
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           default: 15
 *         description: Rayon de recherche en km
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Nom de médicament, spécialité médicale ou symptôme
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [ALL, PHARMACIES, DOCTORS, EMERGENCY_CLINICS]
 *           default: ALL
 */
router.get('/nearby', SearchController.searchNearbyHealth);

export default router;
