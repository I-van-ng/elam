import { Request, Response } from 'express';
import { PharmacyService } from '../services/pharmacy.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class PharmacyController {
  static async listPharmacies(req: Request, res: Response) {
    try {
      const { lat, lng, radiusKm, city, isOnDuty, acceptsCnamgs, search } = req.query as any;
      const pharmacies = await PharmacyService.listPharmacies({
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
        city,
        isOnDuty: isOnDuty !== undefined ? isOnDuty === 'true' || isOnDuty === true : undefined,
        acceptsCnamgs: acceptsCnamgs !== undefined ? acceptsCnamgs === 'true' || acceptsCnamgs === true : undefined,
        search,
      });
      return sendSuccess(res, pharmacies, 'Liste des pharmacies récupérée');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getPharmacyById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { lat, lng } = req.query as any;
      const pharmacy = await PharmacyService.getPharmacyById(
        id,
        lat ? parseFloat(lat) : undefined,
        lng ? parseFloat(lng) : undefined
      );
      return sendSuccess(res, pharmacy, 'Détails de la pharmacie');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  static async updateDutyStatus(req: Request, res: Response) {
    try {
      const { isOnDuty, onDutyUntil } = req.body;
      const result = await PharmacyService.updateDutyStatus(req.user!.id, isOnDuty, onDutyUntil);
      return sendSuccess(res, result, 'Statut de garde actualisé');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async updateStock(req: Request, res: Response) {
    try {
      const result = await PharmacyService.updateStock(req.user!.id, req.body);
      return sendSuccess(res, result, 'Stock mis à jour');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async batchUpdateStock(req: Request, res: Response) {
    try {
      const { stocks } = req.body;
      const result = await PharmacyService.batchUpdateStock(req.user!.id, stocks);
      return sendSuccess(res, result, 'Mise à jour groupée des stocks effectuée');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async searchMedications(req: Request, res: Response) {
    try {
      const { q, lat, lng, radiusKm, city, inStockOnly } = req.query as any;
      if (!q) {
        const meds = await PharmacyService.listMedications();
        return sendSuccess(res, meds, 'Catalogue général des médicaments');
      }

      const results = await PharmacyService.searchMedicationAvailability(q, {
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
        city,
        onlyInStock: inStockOnly === 'true' || inStockOnly === true,
      });

      return sendSuccess(res, results, 'Résultats de disponibilité en pharmacie');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async createMedication(req: Request, res: Response) {
    try {
      const result = await PharmacyService.createMedication(req.body);
      return sendSuccess(res, result, 'Médicament ajouté au catalogue', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async createReservation(req: Request, res: Response) {
    try {
      const result = await PharmacyService.createReservation(req.user!.id, req.body);
      return sendSuccess(res, result, 'Demande de réservation envoyée à la pharmacie', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getPharmacyReservations(req: Request, res: Response) {
    try {
      const reservations = await PharmacyService.getPharmacyReservations(req.user!.id);
      return sendSuccess(res, reservations, 'Liste des réservations de médicaments');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async updateReservationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await PharmacyService.updateReservationStatus(req.user!.id, id, status);
      return sendSuccess(res, result, `Statut de la réservation mis à jour: ${status}`);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}
