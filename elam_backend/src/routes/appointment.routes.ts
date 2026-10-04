import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { Role } from '../types/enums.js';
import {
  bookAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../schemas/appointment.schema.js';

const router = Router();

/**
 * @openapi
 * /api/v1/appointments:
 *   post:
 *     summary: Prendre un rendez-vous médical (Patient)
 *     tags: [Rendez-vous & Consultations]
 */
router.post(
  '/',
  authenticate,
  authorize(Role.PATIENT),
  validateRequest(bookAppointmentSchema),
  AppointmentController.bookAppointment
);

/**
 * @openapi
 * /api/v1/appointments/doctor:
 *   get:
 *     summary: Récupérer les rendez-vous du praticien connecté
 *     tags: [Rendez-vous & Consultations]
 */
router.get(
  '/doctor',
  authenticate,
  authorize(Role.DOCTOR),
  AppointmentController.getDoctorAppointments
);

/**
 * @openapi
 * /api/v1/appointments/patient:
 *   get:
 *     summary: Récupérer l'historique et les rendez-vous à venir du patient
 *     tags: [Rendez-vous & Consultations]
 */
router.get(
  '/patient',
  authenticate,
  authorize(Role.PATIENT),
  AppointmentController.getPatientAppointments
);

/**
 * @openapi
 * /api/v1/appointments/{id}/status:
 *   patch:
 *     summary: Confirmer, annuler ou compléter une consultation
 *     tags: [Rendez-vous & Consultations]
 */
router.patch(
  '/:id/status',
  authenticate,
  validateRequest(updateAppointmentStatusSchema),
  AppointmentController.updateAppointmentStatus
);

export default router;
