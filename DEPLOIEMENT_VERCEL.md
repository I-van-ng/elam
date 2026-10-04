# Déploiement ELAM sur Vercel

## Architecture recommandée

Déployer deux projets Vercel depuis le même dépôt GitHub :

- `elam-frontend` avec le répertoire racine `elam_frontend`
- `elam-backend` avec le répertoire racine `elam_backend`

Le frontend appelle ensuite l'API backend via `VITE_API_URL`.

## Frontend React

Le fichier `vercel.json` dans `elam_frontend` est configuré pour déployer l'application web :

- Build command : `npm ci && npm run build`
- Output directory : `dist`
- Framework : Vite

Dans Vercel :

1. Importer le dépôt GitHub.
2. Sélectionner le projet `elam_frontend`.
3. Laisser Vercel lire `vercel.json`.
4. Ajouter la variable `VITE_API_URL` quand l'URL backend est disponible :

```text
VITE_API_URL=https://votre-backend.vercel.app/api/v1
```

5. Déployer.

## API backend

Le backend est configuré comme service Vercel depuis `elam_backend`.

Dans Vercel :

1. Importer le même dépôt GitHub une deuxième fois.
2. Choisir `elam_backend` comme projet unique d'importation.
3. Ajouter les variables d'environnement backend :

- `DATABASE_URL` : URL PostgreSQL distante (Neon, Supabase, Vercel Postgres, Railway, etc.)
- `JWT_SECRET` : secret long et unique
- `JWT_EXPIRES_IN` : `7d`
- `CORS_ORIGIN` : URL du frontend Vercel, ou `*` pendant les tests
- `NODE_ENV` : `production`

Après le premier déploiement backend, lancer la synchronisation Prisma depuis la machine locale ou depuis un job sécurisé :

```bash
cd elam_backend
npm run prisma:push
npm run prisma:seed
```

Important : `DATABASE_URL` doit pointer vers la base PostgreSQL de production avant d'exécuter ces commandes.
