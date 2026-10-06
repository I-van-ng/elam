import { ENV } from '../../config/env.js';
import {
  CollectionRequest,
  CollectionResult,
  PaymentProvider,
  PaymentProviderName,
  PaymentStatus,
  ProviderStatusResult,
  WebhookResult,
} from './types.js';

interface SandboxTransaction {
  transactionRef: string;
  providerRef: string;
  amount: number;
  phone: string;
  operator: string;
  createdAt: number;
  forcedStatus?: PaymentStatus;
}

/**
 * Fournisseur de developpement : reproduit fidelement le comportement d'un
 * operateur Mobile Money, sans sortir d'argent.
 *
 * - requestCollection() renvoie PENDING et une consigne USSD, exactement comme
 *   Airtel ou Moov ;
 * - le client "valide sur son telephone" : au bout de SANDBOX_CONFIRM_AFTER_MS
 *   la transaction passe COMPLETED, ce qui simule le webhook de l'operateur ;
 * - simulateCallback() permet de forcer un echec pour tester le chemin d'erreur.
 *
 * Ne JAMAIS activer ce fournisseur en production : il confirme les paiements
 * sans qu'aucun argent ne soit encaisse.
 */
export class SandboxProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'SANDBOX';

  private transactions = new Map<string, SandboxTransaction>();
  private counter = 0;

  isConfigured(): boolean {
    return true;
  }

  async requestCollection(request: CollectionRequest): Promise<CollectionResult> {
    this.counter += 1;
    const providerRef = `SBX-${Date.now().toString(36).toUpperCase()}-${this.counter}`;

    this.transactions.set(request.transactionRef, {
      transactionRef: request.transactionRef,
      providerRef,
      amount: request.amount,
      phone: request.phone,
      operator: request.operator,
      createdAt: Date.now(),
    });

    const ussd = request.operator === 'MOOV_MONEY' ? '*555#' : '*128#';

    return {
      accepted: true,
      status: 'PENDING',
      providerRef,
      instructions:
        `SIMULATION — Une demande de ${request.amount} ${request.currency} a ete envoyee au ${request.phone}. ` +
        `Validez sur votre telephone (${ussd}).`,
      raw: { sandbox: true, providerRef },
    };
  }

  async getStatus(transactionRef: string, providerRef?: string): Promise<ProviderStatusResult> {
    const tx = this.transactions.get(transactionRef);
    if (!tx) {
      return { status: 'UNKNOWN', providerRef, errorMessage: 'Transaction inconnue du bac a sable.' };
    }

    if (tx.forcedStatus) {
      return { status: tx.forcedStatus, providerRef: tx.providerRef, raw: { sandbox: true, forced: true } };
    }

    const elapsed = Date.now() - tx.createdAt;
    if (elapsed >= ENV.SANDBOX_CONFIRM_AFTER_MS) {
      // Le client a "valide sur son telephone" : on simule le webhook operateur.
      return { status: 'COMPLETED', providerRef: tx.providerRef, raw: { sandbox: true, autoConfirmed: true } };
    }

    return { status: 'PENDING', providerRef: tx.providerRef, raw: { sandbox: true, elapsedMs: elapsed } };
  }

  /** Force un statut : sert a tester le chemin d'echec (solde insuffisant, refus...). */
  simulateCallback(transactionRef: string, status: PaymentStatus, reason?: string): WebhookResult {
    const tx = this.transactions.get(transactionRef);
    if (tx) {
      tx.forcedStatus = status;
    }
    return { transactionRef, providerRef: tx?.providerRef, status, reason };
  }

  verifyWebhook(_headers: Record<string, unknown>, _rawBody: string): boolean {
    // En bac a sable il n'y a pas de signature operateur a verifier.
    return true;
  }

  parseWebhook(payload: Record<string, unknown>): WebhookResult {
    const transaction = (payload?.transaction as Record<string, unknown>) || {};
    return {
      transactionRef: (payload?.transactionRef as string) || (transaction?.reference as string),
      providerRef: (payload?.providerRef as string) || (transaction?.id as string),
      status: ((payload?.status as string) || 'UNKNOWN').toUpperCase() as PaymentStatus | 'UNKNOWN',
      reason: payload?.reason as string,
    };
  }
}
