import swaggerJsdoc from 'swagger-jsdoc';
import { ENV } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ELAM API - Le Waze de la Santé au Gabon',
      version: '1.0.0',
      description: `
Plateforme numérique de mise en relation des acteurs de santé au Gabon.
- **Patients** : Recherche de pharmacies, gardes, stocks de médicaments, prise de RDV médecins/cliniques.
- **Pharmacies** : Gestion des stocks temps réel, gardes, réservations d'ordonnances.
- **Médecins & Cliniques** : Agenda, téléconsultation, gestion des consultations, affiliation CNAMGS.
- **Assurance & CNAMGS** : Détection des structures conventionnées.
- **Abonnements & Monétisation** : Modèle économique par souscription et services pro.
      `,
      contact: {
        name: 'Équipe ELAM Gabon',
        email: 'contact@elam.ga',
      },
    },
    servers: [
      {
        url: `http://localhost:${ENV.PORT}`,
        description: 'Serveur Local / Développement',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
