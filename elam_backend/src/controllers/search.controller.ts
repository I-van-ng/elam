import { Request, Response } from 'express';
import { SearchService } from '../services/search.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class SearchController {
  static async searchNearbyHealth(req: Request, res: Response) {
    try {
      const { lat, lng, radiusKm, query, filter } = req.query as any;
      if (!lat || !lng) {
        return sendError(res, 'Coordonnées GPS (lat et lng) obligatoires pour la recherche de proximité', 400);
      }

      const results = await SearchService.searchNearbyHealth({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radiusKm: radiusKm ? parseFloat(radiusKm) : 15,
        query,
        filter,
      });

      return sendSuccess(res, results, 'Résultats Waze Santé à proximité');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}
