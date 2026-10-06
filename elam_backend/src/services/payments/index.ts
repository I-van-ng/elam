import { ENV } from '../../config/env.js';
import { AirtelMoneyProvider } from './airtel.provider.js';
import { MoovMoneyProvider } from './moov.provider.js';
import { SandboxProvider } from './sandbox.provider.js';
import { PaymentOperator, PaymentProvider, PaymentProviderName } from './types.js';

export * from './types.js';

export const sandboxProvider = new SandboxProvider();
export const airtelProvider = new AirtelMoneyProvider();
export const moovProvider = new MoovMoneyProvider();

/**
 * Renvoie le fournisseur a utiliser pour un operateur donne.
 *
 * - PAYMENT_PROVIDER=SANDBOX (defaut) : tout passe par le bac a sable, ce qui
 *   permet de developper et de tester sans identifiants operateur.
 * - PAYMENT_PROVIDER=AIRTEL_MONEY / MOOV_MONEY : on route vers le vrai
 *   operateur choisi par le client selon son numero.
 */
export function getProviderFor(operator: PaymentOperator): PaymentProvider {
  if (ENV.PAYMENT_PROVIDER === 'SANDBOX') {
    return sandboxProvider;
  }

  switch (operator) {
    case 'AIRTEL_MONEY':
      return airtelProvider;
    case 'MOOV_MONEY':
      return moovProvider;
    default:
      return sandboxProvider;
  }
}

/** Etat de configuration des fournisseurs (pour le diagnostic au demarrage). */
export function describeProviders(): Array<{ name: PaymentProviderName; configured: boolean; active: boolean }> {
  return [
    { name: 'SANDBOX', configured: true, active: ENV.PAYMENT_PROVIDER === 'SANDBOX' },
    { name: 'AIRTEL_MONEY', configured: airtelProvider.isConfigured(), active: ENV.PAYMENT_PROVIDER === 'AIRTEL_MONEY' },
    { name: 'MOOV_MONEY', configured: moovProvider.isConfigured(), active: ENV.PAYMENT_PROVIDER === 'MOOV_MONEY' },
  ];
}

/** Avertissements a afficher au demarrage : jamais de silence sur une mauvaise config. */
export function paymentStartupWarnings(): string[] {
  const warnings: string[] = [];

  if (ENV.PAYMENT_PROVIDER === 'SANDBOX') {
    warnings.push(
      'PAIEMENT EN MODE SIMULATION : aucune somme reelle n\'est encaissee. ' +
        'Renseigne PAYMENT_PROVIDER=AIRTEL_MONEY ou MOOV_MONEY avec les identifiants du contrat marchand.'
    );
  }

  if (ENV.PAYMENT_PROVIDER === 'AIRTEL_MONEY' && !airtelProvider.isConfigured()) {
    warnings.push('PAYMENT_PROVIDER=AIRTEL_MONEY mais AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET sont absents : les paiements echoueront.');
  }

  if (ENV.PAYMENT_PROVIDER === 'MOOV_MONEY' && !moovProvider.isConfigured()) {
    warnings.push('PAYMENT_PROVIDER=MOOV_MONEY mais MOOV_BASE_URL / MOOV_MERCHANT_CODE / MOOV_API_KEY sont absents : les paiements echoueront.');
  }

  if (ENV.PAYMENT_PROVIDER !== 'SANDBOX' && !ENV.PAYMENT_WEBHOOK_SECRET) {
    warnings.push(
      'PAYMENT_WEBHOOK_SECRET absent : les webhooks operateur seront REFUSES, donc aucun paiement ne sera confirme.'
    );
  }

  if (ENV.PAYMENT_SANDBOX_ENABLED && ENV.NODE_ENV === 'production') {
    warnings.push('PAYMENT_SANDBOX_ENABLED=true en production : les endpoints de simulation doivent etre desactives.');
  }

  return warnings;
}
