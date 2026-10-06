import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { describeProviders, paymentStartupWarnings } from './services/payments/index.js';

const app = createApp();

app.listen(ENV.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SERVEUR ELAM HEALTH ACTIF`);
  console.log(`📍 Port : http://localhost:${ENV.PORT}`);
  console.log(`📑 Documentation Swagger : http://localhost:${ENV.PORT}/api-docs`);
  console.log(`🩺 Healthcheck : http://localhost:${ENV.PORT}/health`);
  console.log(`🇬🇦 Couverture : Gabon (Libreville, Port-Gentil, Akanda...)`);

  // ------------------------------------------------------------------
  // Etat des fournisseurs de paiement : une mauvaise configuration doit
  // se voir tout de suite, jamais echouer en silence.
  // ------------------------------------------------------------------
  console.log(`-------------------------------------------------------`);
  console.log(`💳 Paiement Mobile Money — fournisseur actif : ${ENV.PAYMENT_PROVIDER}`);
  for (const provider of describeProviders()) {
    const etat = provider.configured ? 'configuré' : 'NON configuré (identifiants absents)';
    const marque = provider.active ? '← ACTIF' : '';
    console.log(`   • ${provider.name.padEnd(13)} ${etat} ${marque}`);
  }

  const warnings = paymentStartupWarnings();
  if (warnings.length) {
    console.log(`-------------------------------------------------------`);
    for (const warning of warnings) {
      console.log(`⚠️  ${warning}`);
    }
  }
  console.log(`=======================================================`);
});
