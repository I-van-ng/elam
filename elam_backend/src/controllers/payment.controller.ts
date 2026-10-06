import { Request, Response } from 'express';
import { PaymentService, PaymentError } from '../services/payment.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/** Traduit les erreurs metier en reponses HTTP coherentes. */
function handleError(res: Response, error: unknown) {
  if (error instanceof PaymentError) {
    return sendError(res, error.message, error.statusCode);
  }
  console.error('[PAYMENT] Erreur inattendue:', error);
  return sendError(
    res,
    error instanceof Error ? error.message : 'Erreur lors du traitement du paiement.',
    500
  );
}

export class PaymentController {
  /** POST /payments/initiate — demarre un encaissement Mobile Money. */
  static async initiate(req: Request, res: Response) {
    try {
      const result = await PaymentService.initiate(req.user!.id, req.body);
      return sendSuccess(
        res,
        result,
        'Demande de paiement envoyee. Validez la transaction sur votre telephone.',
        201
      );
    } catch (error) {
      return handleError(res, error);
    }
  }

  /** GET /payments/verify/:transactionRef — interroge l'operateur et met a jour l'etat. */
  static async verify(req: Request, res: Response) {
    try {
      const payment = await PaymentService.refreshStatus(req.user!.id, req.params.transactionRef);
      return sendSuccess(res, payment, 'Etat du paiement');
    } catch (error) {
      return handleError(res, error);
    }
  }

  /** GET /payments/history — uniquement les paiements de l'utilisateur connecte. */
  static async history(req: Request, res: Response) {
    try {
      const payments = await PaymentService.history(req.user!.id);
      return sendSuccess(res, payments, 'Historique de vos paiements');
    } catch (error) {
      return handleError(res, error);
    }
  }

  // ----------------------------------------------------------------------
  // Webhooks operateur : appeles par Airtel / Moov. Non authentifies par JWT,
  // mais verifies par signature cote fournisseur (jamais acceptes sans secret).
  // ----------------------------------------------------------------------
  static webhookAirtel(req: Request, res: Response) {
    return PaymentController.handleWebhook('AIRTEL_MONEY', req, res);
  }

  static webhookMoov(req: Request, res: Response) {
    return PaymentController.handleWebhook('MOOV_MONEY', req, res);
  }

  static webhookSandbox(req: Request, res: Response) {
    return PaymentController.handleWebhook('SANDBOX', req, res);
  }

  private static async handleWebhook(
    provider: 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'SANDBOX',
    req: Request,
    res: Response
  ) {
    try {
      const rawBody =
        (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body || {});
      const payment = await PaymentService.handleWebhook(
        provider,
        req.headers as Record<string, unknown>,
        rawBody,
        (req.body || {}) as Record<string, unknown>
      );
      return sendSuccess(res, payment, 'Webhook traite');
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * POST /payments/sandbox/simulate/:transactionRef
   * Simule la reponse de l'operateur. Uniquement hors production.
   */
  static async sandboxSimulate(req: Request, res: Response) {
    try {
      const payment = await PaymentService.simulateSandbox(
        req.params.transactionRef,
        req.body.status,
        req.body.reason
      );
      return sendSuccess(res, payment, 'Simulation appliquee');
    } catch (error) {
      return handleError(res, error);
    }
  }
}
