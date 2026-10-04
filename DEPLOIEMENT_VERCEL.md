# Déploiement ELAM sur Vercel

## Frontend React

Le fichier `vercel.json` à la racine du dépôt est configuré pour déployer l'application web :

- Build command : `cd elam_frontend && npm ci && npm run build`
- Output directory : `elam_frontend/dist`
- Framework : Vite

Dans Vercel :

1. Importer le dépôt GitHub.
2. Sélectionner le projet `elam_frontend` si Vercel affiche plusieurs applications.
3. Laisser Vercel lire `vercel.json`.
4. Déployer.

## API backend

Le frontend peut fonctionner avec ses données de secours si l'API n'est pas disponible.

Pour connecter une API de production, ajouter dans Vercel une variable d'environnement :

```text
VITE_API_URL=https://votre-api.example.com/api/v1
```

Important : le backend actuel utilise Prisma avec SQLite en développement. Pour une API durable en production, il faut passer `DATABASE_URL` vers une base distante comme PostgreSQL, Neon, Supabase ou Vercel Postgres, puis adapter `prisma/schema.prisma` avec `provider = "postgresql"`.
