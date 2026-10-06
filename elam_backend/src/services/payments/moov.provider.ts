import crypto from 'crypto';
import { ENV } from '../../config/env.js';
import {
  CollectionRequest,
  CollectionResult,
  PaymentProvider,
  PaymentProviderName,
  PaymentStatus,
  ProviderConfigError,
  ProviderStatusResult,
  WebhookResult,
} from './types.js';

/**
 * Moov Money — API marchand Moov Africa.
 *
 * ATTENTION — a lire avant mise en production :
 * contrairement a Airtel, l'API marchand Moov Africa est DECLINEE PAR PAYS.
 * Les chemins, l'authentification et le format du corps varient (Burkina, Togo,
 * Benin, Gabon...). La documentation publique trouvee couvre d'autres marches.
 *
 * Ce client est donc entierement pilote par configuration :
 *   MOOV_BASE_URL, MOOV_AUTH_PATH, MOOV_COLLECT_PATH, MOOV_STATUS_PATH,
 *   MOOV_MERCHANT_CODE, MOOV_API_KEY, MOOV_API_SECRET
 *
 * Des que tu recois la documentation Moov Gabon, tu ajustes les chemins et, si
 * le corps differe, la methode buildCollectBody() ci-dessous. Rien d'autre a
 * toucher : le reste de l'application ne connait que l'interface PaymentProvider.
 *
 * Ce client n'invente JAMAIS un succes : sans identifiants, il leve une erreur
 * explicite.
 */
export class MoovMoneyProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'MOOV_MONEY';

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  isConfigured(): boolean {
    return Boolean(ENV.MOOV_BASE_URL && ENV.MOOV_MERCHANT_CODE && (ENV.MOOV_API_KEY || ENV.MOOV_API_SECRET));
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderConfigError(
        'Moov Money non configure : renseigne MOOV_BASE_URL, MOOV_MERCHANT_CODE et MOOV_API_KEY ' +
          '(identifiants du contrat marchand Moov Africa Gabon). Les chemins se reglent avec ' +
          'MOOV_AUTH_PATH / MOOV_COLLECT_PATH / MOOV_STATUS_PATH.'
      );
    }
  }

  /** Authentification : jeton OAuth2 si des identifiants sont fournis. */
  private async getAccessToken(): Promise<string | null> {
    if (!ENV.MOOV_API_KEY || !ENV.MOOV_API_SECRET) {
      return null; // certains contrats Moov utilisent une simple cle d'API
    }

    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await fetch(`${ENV.MOOV_BASE_URL}${ENV.MOOV_AUTH_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_code: ENV.MOOV_MERCHANT_CODE,
        api_key: ENV.MOOV_API_KEY,
        api_secret: ENV.MOOV_API_SECRET,
        grant_type: 'client_credentials',
      }),
    });

    const payload: any = await response.json().catch(() => ({}));
    const token = payload?.access_token || payload?.token || payload?.data?.access_token;
    if (!response.ok || !token) {
      throw new ProviderConfigError(
        `Authentification Moov refusee (HTTP ${response.status}). Verifie MOOV_API_KEY / MOOV_API_SECRET.`
      );
    }

    this.accessToken = token as string;
    const ttl = parseInt(String(payload.expires_in || '3600'), 10);
    this.tokenExpiresAt = now + Math.max(60, ttl - 60) * 1000;
    return this.accessToken;
  }

  /**
   * Corps de la demande d'encaissement.
   * A ADAPTER si la documentation Moov Gabon differe — c'est le seul endroit.
   */
  private buildCollectBody(request: CollectionRequest): Record<string, unknown> {
    return {
      merchant_code: ENV.MOOV_MERCHANT_CODE,
      reference: request.transactionRef,
      amount: request.amount,
      currency: request.currency || ENV.MOOV_CURRENCY,
      customer_msisdn: request.phone.replace(/\D/g, ''),
      description: request.description,
      callback_url: process.env.PAYMENT_CALLBACK_URL || undefined,
    };
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Merchant-Code': ENV.MOOV_MERCHANT_CODE,
    };
    const token = await this.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (ENV.MOOV_API_KEY) {
      headers['X-Api-Key'] = ENV.MOOV_API_KEY;
    }
    return headers;
  }

  async requestCollection(request: CollectionRequest): Promise<CollectionResult> {
    this.assertConfigured();

    const response = await fetch(`${ENV.MOOV_BASE_URL}${ENV.MOOV_COLLECT_PATH}`, {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify(this.buildCollectBody(request)),
    });

    const payload: any = await response.json().catch(() => ({}));
    const success =
      response.ok && (payload?.success === true || payload?.status === 'PENDING' || payload?.status === 'SUCCESS');

    if (!success) {
      return {
        accepted: false,
        status: 'FAILED',
        errorMessage:
          payload?.message || payload?.error || `Moov a refuse la demande (HTTP ${response.status}).`,
        raw: payload,
      };
    }

    return {
      accepted: true,
      status: 'PENDING',
      providerRef: payload?.transaction_id || payload?.data?.transaction_id || payload?.reference,
      instructions:
        `Une demande de ${request.amount} ${request.currency} a ete envoyee au ${request.phone}. ` +
        `Validez la transaction sur votre telephone (*555#).`,
      raw: payload,
    };
  }

  async getStatus(transactionRef: string, providerRef?: string): Promise<ProviderStatusResult> {
    this.assertConfigured();
    const id = providerRef || transactionRef;
    const path = ENV.MOOV_STATUS_PATH.replace('{ref}', encodeURIComponent(id));

    const response = await fetch(`${ENV.MOOV_BASE_URL}${path}`, {
      method: 'GET',
      headers: await this.authHeaders(),
    });

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { status: 'UNKNOWN', providerRef: id, errorMessage: `HTTP ${response.status}`, raw: payload };
    }

    const raw = String(payload?.status || payload?.data?.status || '').toUpperCase();
    return { status: this.mapStatus(raw), providerRef: id, raw: payload };
  }

  /** Traduit les statuts Moov vers notre cycle de vie. A ajuster si besoin. */
  private mapStatus(moovStatus: string): PaymentStatus | 'UNKNOWN' {
    switch (moovStatus) {
      case 'SUCCESS':
      case 'SUCCESSFUL':
      case 'COMPLETED':
      case 'PAID':
        return 'COMPLETED';
      case 'FAILED':
      case 'REJECTED':
      case 'CANCELLED':
        return 'FAILED';
      case 'PENDING':
      case 'PROCESSING':
      case 'INITIATED':
        return 'PENDING';
      default:
        return 'UNKNOWN';
    }
  }

  verifyWebhook(headers: Record<string, unknown>, rawBody: string): boolean {
    const secret = ENV.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      console.error(
        '[PAYMENT] PAYMENT_WEBHOOK_SECRET absent : webhook Moov refuse. ' +
          'Renseigne-le pour accepter les confirmations de paiement.'
      );
      return false;
    }

    const signature = String(headers['x-moov-signature'] || headers['x-signature'] || '');
    if (signature) {
      const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
      const a = Buffer.from(signature.toLowerCase());
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    const token = String(headers['x-webhook-secret'] || '');
    if (!token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  parseWebhook(payload: Record<string, unknown>): WebhookResult {
    const data = (payload?.data as Record<string, unknown>) || payload || {};
    const status = String(data?.status || '').toUpperCase();

    return {
      transactionRef: (data?.reference as string) || (payload?.reference as string),
      providerRef: (data?.transaction_id as string) || (payload?.transaction_id as string),
      status: this.mapStatus(status),
      reason: (data?.message as string) || (payload?.message as string),
    };
  }
}
