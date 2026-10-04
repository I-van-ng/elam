import { Router } from 'express';
import authRoutes from './auth.routes.js';
import pharmacyRoutes from './pharmacy.routes.js';
import doctorRoutes from './doctor.routes.js';
import appointmentRoutes from './appointment.routes.js';
import clinicRoutes from './clinic.routes.js';
import searchRoutes from './search.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import paymentRoutes from './payment.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/pharmacies', pharmacyRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/clinics', clinicRoutes);
router.use('/search', searchRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);

export default router;
