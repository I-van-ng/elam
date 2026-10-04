import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AuthController {
  static async registerPatient(req: Request, res: Response) {
    try {
      const result = await AuthService.registerPatient(req.body);
      return sendSuccess(res, result, 'Compte patient créé avec succès', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Erreur lors de l\'inscription', 400);
    }
  }

  static async registerDoctor(req: Request, res: Response) {
    try {
      const result = await AuthService.registerDoctor(req.body);
      return sendSuccess(
        res,
        result,
        'Compte médecin créé avec succès. En attente de vérification CNOM.',
        201
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Erreur lors de l\'inscription médecin', 400);
    }
  }

  static async registerPharmacy(req: Request, res: Response) {
    try {
      const result = await AuthService.registerPharmacy(req.body);
      return sendSuccess(
        res,
        result,
        'Compte pharmacie créé avec succès. En attente de validation.',
        201
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Erreur lors de l\'inscription pharmacie', 400);
    }
  }

  static async registerClinic(req: Request, res: Response) {
    try {
      const result = await AuthService.registerClinic(req.body);
      return sendSuccess(
        res,
        result,
        'Établissement créé avec succès. En attente de validation.',
        201
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Erreur lors de l\'inscription de l\'établissement', 400);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { emailOrPhone, password } = req.body;
      const result = await AuthService.login(emailOrPhone, password);
      return sendSuccess(res, result, 'Connexion réussie');
    } catch (error: any) {
      return sendError(res, error.message || 'Erreur lors de la connexion', 401);
    }
  }

  static async getMe(req: Request, res: Response) {
    try {
      const user = await AuthService.getCurrentUser(req.user!.id);
      return sendSuccess(res, user, 'Profil récupéré avec succès');
    } catch (error: any) {
      return sendError(res, error.message || 'Erreur lors de la récupération du profil', 400);
    }
  }
}
