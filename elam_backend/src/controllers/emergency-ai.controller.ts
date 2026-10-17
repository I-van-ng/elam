import { Request, Response } from 'express';
import { EmergencyAiService } from '../services/emergency-ai.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class EmergencyAiController {
  /**
   * Retourne la liste des protocoles de secours et les numéros d'urgence officiels au Gabon
   */
  static async getProtocols(req: Request, res: Response) {
    try {
      const data = EmergencyAiService.getProtocols();
      return sendSuccess(res, data, 'Protocoles de secours et contacts d’urgence');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Analyse une situation d'urgence et retourne des conseils de premiers secours immédiats
   */
  static async consult(req: Request, res: Response) {
    try {
      const { message, history, situation, victimState, location } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return sendError(res, 'Le message décrivant l’urgence est requis.', 400);
      }

      const response = await EmergencyAiService.consult({
        message,
        history,
        situation,
        victimState,
        location,
      });

      return sendSuccess(res, response, 'Instructions de premiers secours générées');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
}
