import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  registerPatientSchema,
  registerDoctorSchema,
  registerPharmacySchema,
  registerClinicSchema,
  loginSchema,
} from '../schemas/auth.schema.js';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register/patient:
 *   post:
 *     summary: Inscription d'un nouveau patient (Gratuit)
 *     tags: [Authentification]
 */
router.post('/register/patient', validateRequest(registerPatientSchema), AuthController.registerPatient);

/**
 * @openapi
 * /api/v1/auth/register/doctor:
 *   post:
 *     summary: Inscription d'un médecin avec numéro CNOM
 *     tags: [Authentification]
 */
router.post('/register/doctor', validateRequest(registerDoctorSchema), AuthController.registerDoctor);

/**
 * @openapi
 * /api/v1/auth/register/pharmacy:
 *   post:
 *     summary: Inscription d'une officine de pharmacie
 *     tags: [Authentification]
 */
router.post('/register/pharmacy', validateRequest(registerPharmacySchema), AuthController.registerPharmacy);

/**
 * @openapi
 * /api/v1/auth/register/clinic:
 *   post:
 *     summary: Inscription d'une clinique ou d'un hôpital
 *     tags: [Authentification]
 */
router.post('/register/clinic', validateRequest(registerClinicSchema), AuthController.registerClinic);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Connexion avec email ou téléphone
 *     tags: [Authentification]
 */
router.post('/login', validateRequest(loginSchema), AuthController.login);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Récupérer le profil et rôle de l'utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, AuthController.getMe);

export default router;
