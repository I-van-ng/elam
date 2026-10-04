import { createApp } from './app.js';
import { ENV } from './config/env.js';

const app = createApp();

app.listen(ENV.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SERVEUR ELAM HEALTH ACTIF`);
  console.log(`📍 Port : http://localhost:${ENV.PORT}`);
  console.log(`📑 Documentation Swagger : http://localhost:${ENV.PORT}/api-docs`);
  console.log(`🩺 Healthcheck : http://localhost:${ENV.PORT}/health`);
  console.log(`🇬🇦 Couverture : Gabon (Libreville, Port-Gentil, Akanda...)`);
  console.log(`=======================================================`);
});
