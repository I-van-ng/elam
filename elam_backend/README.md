# ELAM Backend API 🇬🇦
> **Le Waze de la Santé au Gabon** — Plateforme numérique connectant Patients, Pharmacies, Médecins spécialistes, Cliniques/Hôpitaux et Assurance (CNAMGS).

---

## 📌 Fonctionnalités Principales

1. **Patients (100% Gratuit) :**
   - Inscription et profil de santé avec numéro CNAMGS.
   - Recherche géolocalisée de pharmacies ouvertes ou de garde.
   - Recherche de disponibilité réelle de médicaments avec indice de fraîcheur (*"Vérifié il y a 15 min"*).
   - Réservation de médicaments / ordonnances auprès des pharmacies partenaires.
   - Recherche de médecins spécialistes par proximité GPS ou ville.
   - Prise de rendez-vous (en cabinet, visite à domicile ou téléconsultation).
   - Carnet de médecins favoris.

2. **Pharmacies :**
   - Gestion du statut de garde (`isOnDuty`).
   - Gestion des stocks de médicaments en temps réel (mise à jour unitaire ou groupée).
   - Réception et traitement des réservations d'ordonnances.

3. **Médecins & Spécialistes :**
   - Profil professionnel vérifié (numéro CNOM / e-CPS).
   - Définition des plages de disponibilité et créneaux horaires.
   - Gestion de l'agenda et validation/suivi des consultations.

4. **Cliniques & Établissements :**
   - Référencement des structures d'urgences 24/7, laboratoires et services spécialisés.
   - Conventionnement CNAMGS.

5. **Moteur "Waze de la Santé" (`/api/v1/search/nearby`) :**
   - Recherche globale unifiée : *"Où puis-je être soigné ou trouver mon médicament maintenant ?"*

6. **Modèle Économique & Abonnements :**
   - Formules professionnelles adaptées (Médecin Pro 10 000 FCFA/mois, Pharmacie Pro 15 000 FCFA/mois, Cliniques, Entreprises).

---

## 🛠️ Stack Technique

- **Langage** : TypeScript / Node.js
- **Framework** : Express.js
- **Base de données / ORM** : Prisma ORM avec SQLite (extensible vers PostgreSQL)
- **Sécurité** : JWT, bcryptjs, Helmet, CORS, Rate-limiting
- **Validation** : Zod
- **Documentation d'API** : Swagger UI (OpenAPI 3.0)

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Base de données & Initialisation (Seed Gabon)
```bash
# Générer le client Prisma et synchroniser la base SQLite
npm run prisma:generate
npm run prisma:push

# Peupler la base avec les données de démonstration (Libreville, Akanda, Glass, etc.)
npm run prisma:seed
```

### 3. Lancer le serveur en mode développement
```bash
npm run dev
```

Le serveur sera accessible sur :
- **API Base** : `http://localhost:5000/api/v1`
- **Documentation interactive Swagger** : `http://localhost:5000/api-docs`
- **Healthcheck** : `http://localhost:5000/health`

### 4. Lancer les tests d'intégration automatisés
```bash
npx tsx scripts/test-api.ts
```

---

## 📂 Structure du Projet

```
elam_backend/
├── prisma/
│   ├── schema.prisma      # Schéma de base de données complet
│   └── seed.ts            # Données réelles gabonaises (médecins, pharmacies, médicaments)
├── scripts/
│   └── test-api.ts        # Suite de tests d'intégration automatisés
├── src/
│   ├── config/            # Variables d'env, Prisma client, Swagger
│   ├── controllers/       # Contrôleurs Express
│   ├── middlewares/       # Auth JWT, RBAC rôles, Zod validation, Error handler
│   ├── routes/            # Définitions des routes d'API
│   ├── schemas/           # Schémas de validation Zod
│   ├── services/          # Logique métier (calcul distance GPS, stocks, RDV)
│   ├── types/             # Enums et interfaces TypeScript
│   ├── utils/             # Fonctions utilitaires (Haversine distance, réponses HTTP)
│   ├── app.ts             # Configuration Express
│   └── server.ts          # Point d'entrée du serveur
├── package.json
└── tsconfig.json
```
