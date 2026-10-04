import { Request, Response } from 'express';
import { ClinicService } from '../services/clinic.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class ClinicController {
  static async listClinics(req: Request, res: Response) {
    try {
      const { lat, lng, radiusKm, city, hasEmergency247, acceptsCnamgs, type, search } = req.query as any;
      const clinics = await ClinicService.listClinics({
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
        city,
        hasEmergency247: hasEmergency247 !== undefined ? hasEmergency247 === 'true' || hasEmergency247 === true : undefined,
        acceptsCnamgs: acceptsCnamgs !== undefined ? acceptsCnamgs === 'true' || acceptsCnamgs === true : undefined,
        type,
        search,
      });
      return sendSuccess(res, clinics, 'Liste des hôpitaux, cliniques et centres d\'urgence');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getClinicById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { lat, lng } = req.query as any;
      const clinic = await ClinicService.getClinicById(
        id,
        lat ? parseFloat(lat) : undefined,
        lng ? parseFloat(lng) : undefined
      );
      return sendSuccess(res, clinic, 'Détails de l\'établissement');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }
}
