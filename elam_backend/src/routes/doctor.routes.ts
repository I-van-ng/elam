import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { Role } from '../types/enums.js';
import {
  updateDoctorProfileSchema,
  setDoctorAvailabilitySchema,
} from '../schemas/doctor.schema.js';

const router = Router();

/**
 * @openapi
 * /api/v1/doctors:
 *   get:
 *     summary: Rechercher des médecins par spécialité, ville ou proximité
 *     tags: [Médecins & Spécialistes]
 */
router.get('/', DoctorController.listDoctors);

/**
 * @openapi
 * /api/v1/doctors/favorites:
 *   get:
 *     summary: Obtenir le carnet des médecins favoris (Patient)
 *     tags: [Médecins & Spécialistes]
 */
router.get('/favorites', authenticate, authorize(Role.PATIENT), DoctorController.getFavorites);

/**
 * @openapi
 * /api/v1/doctors/favorites/{doctorId}:
 *   post:
 *     summary: Ajouter ou retirer un médecin de ses favoris
 *     tags: [Médecins & Spécialistes]
 */
router.post(
  '/favorites/:doctorId',
  authenticate,
  authorize(Role.PATIENT),
  DoctorController.toggleFavorite
);

/**
 * @openapi
 * /api/v1/doctors/profile:
 *   patch:
 *     summary: Mettre à jour son profil professionnel de médecin
 *     tags: [Médecins & Spécialistes]
 */
router.patch(
  '/profile',
  authenticate,
  authorize(Role.DOCTOR),
  validateRequest(updateDoctorProfileSchema),
  DoctorController.updateProfile
);

/**
 * @openapi
 * /api/v1/doctors/availabilities:
 *   post:
 *     summary: Définir les plages horaires et durées de consultation (Médecin)
 *     tags: [Médecins & Spécialistes]
 */
router.post(
  '/availabilities',
  authenticate,
  authorize(Role.DOCTOR),
  validateRequest(setDoctorAvailabilitySchema),
  DoctorController.setAvailabilities
);

/**
 * @openapi
 * /api/v1/doctors/{id}:
 *   get:
 *     summary: Fiche détaillée d'un médecin (spécialités, tarifs, avis, créneaux)
 *     tags: [Médecins & Spécialistes]
 */
router.get('/:id', DoctorController.getDoctorById);

export default router;
