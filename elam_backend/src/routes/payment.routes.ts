import { Router } from 'express';
import { initiatePayment, verifyPayment, getPaymentHistory } from '../controllers/payment.controller.js';

const router = Router();

router.post('/initiate', initiatePayment);
router.get('/verify/:transactionRef', verifyPayment);
router.get('/history', getPaymentHistory);

export default router;
