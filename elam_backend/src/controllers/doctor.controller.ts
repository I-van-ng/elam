import { Request, Response } from 'express';
import { DoctorService } from '../services/doctor.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class DoctorController {
  static async listDoctors(req: Request, res: Response) {
    try {
      const { specialty, city, district, acceptsCnamgs, acceptsTeleconsult, lat, lng, radiusKm, search } = req.query as any;
      const doctors = await DoctorService.listDoctors({
        specialty,
        city,
        district,
        acceptsCnamgs: acceptsCnamgs !== undefined ? acceptsCnamgs === 'true' || acceptsCnamgs === true : undefined,
        acceptsTeleconsult: acceptsTeleconsult !== undefined ? acceptsTeleconsult === 'true' || acceptsTeleconsult === true : undefined,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
        search,
      });
      return sendSuccess(res, doctors, 'Liste des médecins spécialistes');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getDoctorById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { lat, lng } = req.query as any;
      const doctor = await DoctorService.getDoctorById(
        id,
        lat ? parseFloat(lat) : undefined,
        lng ? parseFloat(lng) : undefined
      );
      return sendSuccess(res, doctor, 'Détails du médecin');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const result = await DoctorService.updateProfile(req.user!.id, req.body);
      return sendSuccess(res, result, 'Profil médecin mis à jour');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async setAvailabilities(req: Request, res: Response) {
    try {
      const { availabilities } = req.body;
      const result = await DoctorService.setAvailabilities(req.user!.id, availabilities);
      return sendSuccess(res, result, 'Créneaux de disponibilité configurés');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async toggleFavorite(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;
      const result = await DoctorService.toggleFavoriteDoctor(req.user!.id, doctorId);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getFavorites(req: Request, res: Response) {
    try {
      const favorites = await DoctorService.getFavoriteDoctors(req.user!.id);
      return sendSuccess(res, favorites, 'Carnet des médecins favoris');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}
