# ELAM Frontend 🇬🇦
> **Application Web & Mobile-First — Le Waze de la Santé au Gabon**

---

## 🌟 Fonctionnalités Implémentées

1. **Recherche Unifiée Waze Santé (`/`) :**
   - Moteur *"Où puis-je être soigné maintenant ?"* avec rayon GPS interactif (Akanda / Libreville).
   - Carte interactive Leaflet avec marqueurs différenciés (Pharmacies de garde en doré, Médecins en bleu, Urgences en rouge, Position actuelle en violet).
   - Raccourcis de recherche rapide (*Pharmacie de garde, Amoxicilline, Coartem, Cardiologue, Pédiatre*).

2. **Pharmacies & Fraîcheur des Stocks (`/pharmacies`) :**
   - Modal de disponibilité exacte des médicaments avec horodatage en direct (*"Vérifié il y a 15 min"*).
   - Filtre instantané des officines de garde et conventionnées **CNAMGS**.
   - Modal de mise de côté / réservation d'ordonnance.

3. **Médecins Spécialistes & Prise de RDV (`/doctors`) :**
   - Filtre par spécialité (*Cardiologie, Pédiatrie, Généraliste, etc.*).
   - Modal de prise de RDV en ligne (sélection de date, créneau horaire, motif, cabinet ou téléconsultation).
   - Badge d'inscription vérifiée au Conseil National de l'Ordre des Médecins (CNOM / e-CPS).

4. **Urgences 24/7 & Hôpitaux (`/clinics`) :**
   - Appel direct d'urgence vers le **SAMU Gabon (1300)**.
   - Liste des hôpitaux et polycliniques avec services spécialisés (CHUL, El Rapha).

5. **Portails Professionnels & Démo Switcher :**
   - **Mode Démo en 1 clic** (dans la barre supérieure) : basculez entre **Patient Hans**, **Dr. Alain Minko (Cardiologue)** et **Pharmacie d'Okala**.
   - **Portail Médecin (`/doctor/dashboard`)** : validation des rendez-vous et gestion des téléconsultations.
   - **Portail Pharmacie (`/pharmacy/dashboard`)** : bascule du statut de garde en direct et ajustement des stocks en 1 clic.

6. **Grille Tarifaire & Abonnements (`/pricing`) :**
   - Présentation du modèle économique (0 FCFA Patient, Médecin 5k/10k, Pharmacie 15k/30k, Cliniques et Entreprises).

---

## 🚀 Démarrage

Dans le dossier `elam_frontend` :
```bash
npm install
npm run dev
```

Pour utiliser l'API locale avec Vite, le proxy `/api` pointe vers `http://localhost:5000`.
En production, définir `VITE_API_URL` vers l'API publique. Le mode démonstration est désactivé par défaut ; définir `VITE_DEMO_MODE=true` uniquement pour activer les profils de démonstration.

L'application sera accessible sur :
- **Web & Mobile Preview** : `http://localhost:3000`
