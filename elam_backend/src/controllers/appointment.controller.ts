import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AppointmentController {
  static async bookAppointment(req: Request, res: Response) {
    try {
      const result = await AppointmentService.bookAppointment(req.user!.id, req.body);
      return sendSuccess(res, result, 'Demande de rendez-vous enregistrée', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getDoctorAppointments(req: Request, res: Response) {
    try {
      const { status, date } = req.query as any;
      const appointments = await AppointmentService.getDoctorAppointments(req.user!.id, status, date);
      return sendSuccess(res, appointments, 'Agenda des rendez-vous médecin');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getPatientAppointments(req: Request, res: Response) {
    try {
      const appointments = await AppointmentService.getPatientAppointments(req.user!.id);
      return sendSuccess(res, appointments, 'Historique des rendez-vous patient');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async updateAppointmentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, doctorNotes } = req.body;
      const result = await AppointmentService.updateAppointmentStatus(req.user!.id, id, status, doctorNotes);
      return sendSuccess(res, result, `Statut du rendez-vous mis à jour: ${status}`);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}
