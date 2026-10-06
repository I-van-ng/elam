/**
 * Contrat commun a tous les fournisseurs de paiement Mobile Money.
 *
 * Airtel Money et Moov Money n'ont pas la meme API ni le meme format de webhook.
 * Tout le reste de l'application ne connait que cette interface : brancher un
 * operateur, c'est ecrire une implementation de PaymentProvider et rien d'autre.
 */

export type PaymentOperator = 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'SANDBOX';

export type PaymentProviderName = 'SANDBOX' | 'AIRTEL_MONEY' | 'MOOV_MONEY';

/** Cycle de vie reel d'un paiement. */
export type PaymentStatus =
  | 'PENDING' // cree, en attente de validation par le client sur son telephone
  | 'PROCESSING' // l'operateur traite la demande
  | 'COMPLETED' // confirme par l'operateur (webhook recu)
  | 'FAILED' // refuse : solde insuffisant, code PIN errone, expiration...
  | 'CANCELLED'; // annule avant validation

/** Demande d'encaissement adressee a l'operateur. */
export interface CollectionRequest {
  /** Reference ELAM, unique : sert aussi de cle d'idempotence. */
  transactionRef: string;
  /** Montant a debiter reellement du client (apres prise en charge CNAMGS). */
  amount: number;
  currency: string;
  /** Numero du client, format international (+241...). */
  phone: string;
  operator: PaymentOperator;
  /** Libelle visible par le client sur son telephone. */
  description: string;
}

/** Reponse de l'operateur a une demande d'encaissement. */
export interface CollectionResult {
  accepted: boolean;
  status: PaymentStatus;
  /** Identifiant de la transaction chez l'operateur. */
  providerRef?: string;
  /** Consigne affichee au client (composer *128#, valider l'invite USSD...). */
  instructions?: string;
  errorMessage?: string;
  raw?: unknown;
}

/** Etat d'une transaction interroge chez l'operateur. */
export interface ProviderStatusResult {
  status: PaymentStatus | 'UNKNOWN';
  providerRef?: string;
  errorMessage?: string;
  raw?: unknown;
}

/** Donnees extraites d'un webhook operateur. */
export interface WebhookResult {
  transactionRef?: string;
  providerRef?: string;
  status: PaymentStatus | 'UNKNOWN';
  reason?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  /** Indique si le fournisseur est correctement configure (identifiants presents). */
  isConfigured(): boolean;

  /** Demarre un encaissement : l'operateur pousse une invite sur le telephone. */
  requestCollection(request: CollectionRequest): Promise<CollectionResult>;

  /** Interroge l'operateur sur l'etat d'une transaction (utilise par le polling). */
  getStatus(transactionRef: string, providerRef?: string): Promise<ProviderStatusResult>;

  /** Verifie l'authenticite d'un webhook recu. */
  verifyWebhook(headers: Record<string, unknown>, rawBody: string): boolean;

  /** Extrait la reference et le statut d'un webhook. */
  parseWebhook(payload: Record<string, unknown>): WebhookResult;
}

/** Erreur levee quand un fournisseur est mal configure : jamais de succes silencieux. */
export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigError';
  }
}
