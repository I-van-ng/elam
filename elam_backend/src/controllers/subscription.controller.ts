import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class SubscriptionController {
  static getPlans(req: Request, res: Response) {
    const plans = SubscriptionService.getAvailablePlans();
    return sendSuccess(res, plans, 'Grille tarifaire et formules d\'abonnement ELAM');
  }

  static async getMySubscription(req: Request, res: Response) {
    try {
      const sub = await SubscriptionService.getUserSubscription(req.user!.id);
      return sendSuccess(res, sub, 'Abonnement actuel de l\'utilisateur');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async subscribe(req: Request, res: Response) {
    try {
      const { planType, autoRenew } = req.body;
      const result = await SubscriptionService.subscribeToPlan(req.user!.id, planType, autoRenew);
      return sendSuccess(res, result, `Souscription au plan ${planType} validée avec succès !`, 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}
