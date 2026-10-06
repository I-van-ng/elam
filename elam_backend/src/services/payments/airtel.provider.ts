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
 * Airtel Money — Airtel Open API.
 *
 * Flux reel :
 *   1. POST /auth/oauth2/token            (OAuth2 client_credentials -> access_token)
 *   2. POST /merchant/v1/payments/         (encaissement : invite USSD sur le telephone)
 *   3. GET  /standard/v1/payments/{id}     (verification de l'etat)
 *   4. Airtel appelle NOTRE webhook des que le client a valide (souvent < 30 s)
 *
 * Statuts Airtel : TIP (en cours), TS (succes), TF (echec), TA (ambigue).
 *
 * IMPORTANT — a valider avec ton contrat marchand Airtel Gabon :
 * l'URL de base, les chemins et le format exact dependent du marche et de
 * l'onboarding. Les valeurs par defaut ci-dessous correspondent a l'API
 * documentee publiquement ; si ton contrat fournit d'autres chemins, ils se
 * reglent par variable d'environnement sans toucher au code.
 */
export class AirtelMoneyProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'AIRTEL_MONEY';

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  isConfigured(): boolean {
    return Boolean(ENV.AIRTEL_CLIENT_ID && ENV.AIRTEL_CLIENT_SECRET);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderConfigError(
        'Airtel Money non configure : renseigne AIRTEL_CLIENT_ID et AIRTEL_CLIENT_SECRET ' +
          '(identifiants du contrat marchand Airtel Gabon).'
      );
    }
  }

  /** OAuth2 client_credentials, avec cache du jeton. */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await fetch(`${ENV.AIRTEL_BASE_URL}/auth/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: '*/*' },
      body: JSON.stringify({
        client_id: ENV.AIRTEL_CLIENT_ID,
        client_secret: ENV.AIRTEL_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.access_token) {
      throw new ProviderConfigError(
        `Authentification Airtel refusee (HTTP ${response.status}). Verifie les identifiants.`
      );
    }

    this.accessToken = payload.access_token as string;
    const ttl = parseInt(String(payload.expires_in || '3600'), 10);
    this.tokenExpiresAt = now + Math.max(60, ttl - 60) * 1000;
    return this.accessToken;
  }

  async requestCollection(request: CollectionRequest): Promise<CollectionResult> {
    this.assertConfigured();
    const token = await this.getAccessToken();

    // Airtel attend le numero sans indicatif pays dans msisdn, mais avec le
    // pays dans 'subscriber'. On nettoie donc l'indicatif 241 du Gabon.
    const msisdn = request.phone.replace(/\D/g, '').replace(/^241/, '').replace(/^0/, '');

    const response = await fetch(`${ENV.AIRTEL_BASE_URL}/merchant/v1/payments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-Country': ENV.AIRTEL_COUNTRY,
        'X-Currency': ENV.AIRTEL_CURRENCY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reference: request.transactionRef,
        subscriber: {
          country: ENV.AIRTEL_COUNTRY,
          currency: ENV.AIRTEL_CURRENCY,
          msisdn,
        },
        transaction: {
          amount: request.amount,
          country: ENV.AIRTEL_COUNTRY,
          currency: ENV.AIRTEL_CURRENCY,
          id: request.transactionRef,
        },
      }),
    });

    const payload: any = await response.json().catch(() => ({}));
    const success = Boolean(payload?.status?.success) && response.ok;

    if (!success) {
      return {
        accepted: false,
        status: 'FAILED',
        errorMessage:
          payload?.status?.message ||
          payload?.message ||
          `Airtel a refuse la demande (HTTP ${response.status}).`,
        raw: payload,
      };
    }

    return {
      accepted: true,
      status: 'PENDING',
      providerRef: payload?.data?.transaction?.id,
      instructions:
        `Une demande de ${request.amount} ${request.currency} a ete envoyee au ${request.phone}. ` +
        `Validez la transaction sur votre telephone (*128#).`,
      raw: payload,
    };
  }

  async getStatus(transactionRef: string, providerRef?: string): Promise<ProviderStatusResult> {
    this.assertConfigured();
    const token = await this.getAccessToken();
    const id = providerRef || transactionRef;

    const response = await fetch(`${ENV.AIRTEL_BASE_URL}/standard/v1/payments/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        Accept: '*/*',
        'X-Country': ENV.AIRTEL_COUNTRY,
        'X-Currency': ENV.AIRTEL_CURRENCY,
        Authorization: `Bearer ${token}`,
      },
    });

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { status: 'UNKNOWN', providerRef: id, errorMessage: `HTTP ${response.status}`, raw: payload };
    }

    const airtelStatus = String(payload?.data?.transaction?.status || '').toUpperCase();
    return {
      status: this.mapStatus(airtelStatus),
      providerRef: payload?.data?.transaction?.airtel_money_id || id,
      raw: payload,
    };
  }

  /** Traduit les statuts Airtel vers notre cycle de vie. */
  private mapStatus(airtelStatus: string): PaymentStatus | 'UNKNOWN' {
    switch (airtelStatus) {
      case 'TS':
      case 'SUCCESS':
      case 'SUCCESSFUL':
        return 'COMPLETED';
      case 'TF':
      case 'FAILED':
        return 'FAILED';
      case 'TA':
      case 'AMBIGUOUS':
        return 'PROCESSING';
      case 'TIP':
      case 'PENDING':
        return 'PENDING';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Airtel ne signe pas nativement les webhooks dans l'offre standard : on
   * verifie donc un secret partage, en HMAC-SHA256 du corps brut si l'en-tete
   * de signature est present, sinon un jeton partage.
   *
   * Refus par defaut si aucun secret n'est configure : on n'accepte jamais un
   * webhook non verifiable.
   */
  verifyWebhook(headers: Record<string, unknown>, rawBody: string): boolean {
    const secret = ENV.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      console.error(
        '[PAYMENT] PAYMENT_WEBHOOK_SECRET absent : webhook Airtel refuse. ' +
          'Renseigne-le pour accepter les confirmations de paiement.'
      );
      return false;
    }

    const signature = String(headers['x-airtel-signature'] || headers['x-signature'] || '');
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
    const transaction = (payload?.transaction as Record<string, unknown>) || {};
    const status = String(transaction?.status || payload?.status || '').toUpperCase();

    return {
      transactionRef: (transaction?.id as string) || (payload?.reference as string),
      providerRef: (payload?.transaction_id as string) || (transaction?.airtel_money_id as string),
      status: this.mapStatus(status),
      reason: (payload?.message as string) || (transaction?.message as string),
    };
  }
}
