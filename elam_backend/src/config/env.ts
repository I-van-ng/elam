import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Secret de signature des jetons JWT.
 *
 * Il n'y a PLUS de valeur par defaut ecrite en dur : l'ancien secret figurait
 * dans le depot (public) et permettait donc de forger n'importe quel jeton,
 * y compris un jeton ADMIN. On exige desormais une vraie configuration.
 */
function resolveJwtSecret(): string {
  const value = process.env.JWT_SECRET;

  if (value && value.length >= 16) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET est obligatoire en production (16 caracteres minimum). ' +
        "Definis-le dans les variables d'environnement de l'hebergeur."
    );
  }

  console.warn(
    '[SECURITE] JWT_SECRET absent en developpement : un secret temporaire est genere. ' +
      'Les jetons emis seront invalides au prochain demarrage.'
  );
  return crypto.randomBytes(32).toString('hex');
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: resolveJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // ==========================================================================
  // Paiement Mobile Money — contrat direct Airtel Money + Moov Money
  // ==========================================================================

  /**
   * Fournisseur actif : SANDBOX | AIRTEL_MONEY | MOOV_MONEY
   * SANDBOX fonctionne sans identifiants (pour developper et tester).
   * AIRTEL_MONEY / MOOV_MONEY exigent les identifiants du contrat marchand.
   */
  PAYMENT_PROVIDER: (process.env.PAYMENT_PROVIDER || 'SANDBOX').toUpperCase(),

  // --- Airtel Money (Airtel Open API) ---
  AIRTEL_BASE_URL: process.env.AIRTEL_BASE_URL || 'https://openapi.airtel.africa',
  AIRTEL_CLIENT_ID: process.env.AIRTEL_CLIENT_ID || '',
  AIRTEL_CLIENT_SECRET: process.env.AIRTEL_CLIENT_SECRET || '',
  AIRTEL_COUNTRY: process.env.AIRTEL_COUNTRY || 'GA',
  AIRTEL_CURRENCY: process.env.AIRTEL_CURRENCY || 'XAF',

  // --- Moov Money (API marchand Moov Africa) ---
  // Les chemins varient selon les pays : a caler sur la documentation Moov Gabon.
  MOOV_BASE_URL: process.env.MOOV_BASE_URL || '',
  MOOV_AUTH_PATH: process.env.MOOV_AUTH_PATH || '/oauth/token',
  MOOV_COLLECT_PATH: process.env.MOOV_COLLECT_PATH || '/api/v1/payments/collect',
  MOOV_STATUS_PATH: process.env.MOOV_STATUS_PATH || '/api/v1/payments/{ref}',
  MOOV_MERCHANT_CODE: process.env.MOOV_MERCHANT_CODE || '',
  MOOV_API_KEY: process.env.MOOV_API_KEY || '',
  MOOV_API_SECRET: process.env.MOOV_API_SECRET || '',
  MOOV_CURRENCY: process.env.MOOV_CURRENCY || 'XAF',

  // --- Securite ---
  /** Secret partage servant a verifier la signature des webhooks operateur. */
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || '',
  /** Taux de prise en charge CNAMGS (0.8 = 80 %). Calcule COTE SERVEUR. */
  CNAMGS_COVERAGE_RATE: parseFloat(process.env.CNAMGS_COVERAGE_RATE || '0.8'),
  /** Delai (ms) avant confirmation automatique en mode SANDBOX. */
  SANDBOX_CONFIRM_AFTER_MS: parseInt(process.env.SANDBOX_CONFIRM_AFTER_MS || '6000', 10),
  /** Autorise les endpoints de simulation (a desactiver en production). */
  PAYMENT_SANDBOX_ENABLED: (process.env.PAYMENT_SANDBOX_ENABLED || 'true') === 'true',
};

