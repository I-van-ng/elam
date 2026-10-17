import { Router } from 'express';
import { EmergencyAiController } from '../controllers/emergency-ai.controller.js';

const router = Router();

// Accès public non restreint : en cas d'urgence vitale, la victime ou le témoin
// ne doit jamais être bloqué par une demande de connexion.
router.get('/protocols', EmergencyAiController.getProtocols);
router.post('/chat', EmergencyAiController.consult);

export default router;
