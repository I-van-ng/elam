# Paiement Mobile Money — Airtel Money & Moov Money

> Contrat direct (chemin A). Le système est **complet et testé en mode simulation**.
> Pour encaisser réellement, il ne reste qu'à renseigner les identifiants du
> contrat marchand : voir § 3.

---

## 1. Comment ça marche maintenant

```
1. Le client saisit son numéro         → le serveur calcule le montant (RDV, réservation ou formule)
2. Le serveur appelle l'opérateur      → "collection" : invite USSD sur le téléphone
3. Le client valide chez son opérateur → il saisit SON code secret chez Airtel/Moov, jamais dans l'app
4. L'opérateur appelle notre webhook   → SEULE source de vérité qui confirme le paiement
5. Le service est alors confirmé       → le RDV devient payé + CONFIRMÉ, la réservation CONFIRMÉE
6. Le client voit son reçu             → montants exacts renvoyés par le serveur
```

En attendant le webhook, le client suit l'état par interrogation périodique
(`GET /payments/verify/:ref`), sur le site comme dans l'app : **« En attente de
validation sur votre téléphone… »** puis confirmation ou échec motivé.

### Le cycle de vie réel

| Statut | Signification |
|---|---|
| `PENDING` | Demande envoyée, le client n'a pas encore validé |
| `PROCESSING` | L'opérateur traite (statut ambigu chez Airtel) |
| `COMPLETED` | **Confirmé par l'opérateur** — le service est débloqué |
| `FAILED` | Refusé : solde insuffisant, code erroné, expiration… |
| `CANCELLED` | Annulé avant validation |

---

## 2. Architecture : une couche fournisseur

Airtel et Moov n'ont ni la même API ni le même format de webhook. Tout le reste
de l'application ne connaît qu'une interface : **brancher un opérateur = écrire
une classe, rien d'autre.**

```
elam_backend/src/services/payments/
├── types.ts              le contrat PaymentProvider + le cycle de vie
├── sandbox.provider.ts   simulation (fonctionne aujourd'hui, sans identifiants)
├── airtel.provider.ts    Airtel Open API : OAuth2 + collection + statut + webhook
├── moov.provider.ts      API marchand Moov Africa (chemins configurables par pays)
└── index.ts              sélection par PAYMENT_PROVIDER + diagnostic au démarrage
```

Le service métier : `elam_backend/src/services/payment.service.ts`

**Règle de conception appliquée partout : jamais de succès silencieux.** Un
fournisseur mal configuré lève une erreur explicite ; les webhooks sont refusés
sans secret ; un paiement en échec ne confirme jamais le service.

---

## 3. Activer Airtel Money puis Moov Money

### 3.1 Ce qu'il faut demander aux opérateurs

Envoie ce message à **Airtel Gabon** (offre entreprise) et à **Moov Africa Gabon Telecom** :

> 1. Proposez-vous une **API marchand** (collection) pour encaisser en ligne ?
> 2. Comment accéder au **sandbox** de test ?
> 3. Quel est le **webhook/callback** de confirmation, et son format exact ?
> 4. **Tarifs** (encaissement, versement, frais fixes) et délai de règlement ?
> 5. Quels **documents** pour ouvrir un compte marchand (RCCM, NIF, compte bancaire) ?
> 6. Délai de mise en production, et **URL de callback** attendue ?

### 3.2 Airtel Money

Renseigne dans `elam_backend/.env` :

```env
PAYMENT_PROVIDER=AIRTEL_MONEY
AIRTEL_CLIENT_ID=...
AIRTEL_CLIENT_SECRET=...
AIRTEL_COUNTRY=GA
AIRTEL_CURRENCY=XAF
PAYMENT_WEBHOOK_SECRET=<un secret long et aleatoire>
PAYMENT_CALLBACK_URL=https://ton-domaine/api/v1/payments/webhook/airtel
```

Le client implémente le flux documenté de l'Airtel Open API :
`POST /auth/oauth2/token` (OAuth2 client_credentials) → `POST /merchant/v1/payments/`
(collection) → `GET /standard/v1/payments/{id}` (statut). Les statuts Airtel
`TIP` / `TS` / `TF` / `TA` sont traduits vers notre cycle de vie.

⚠️ **À valider avec ton contrat** : l'URL de base et les chemins peuvent différer
selon le marché et l'onboarding. S'ils diffèrent, modifie-les dans `env.ts`
(ou via variables d'environnement) sans toucher au reste.

### 3.3 Moov Money

```env
PAYMENT_PROVIDER=MOOV_MONEY
MOOV_BASE_URL=https://<api-moov-gabon>
MOOV_COLLECT_PATH=/api/v1/payments/collect
MOOV_STATUS_PATH=/api/v1/payments/{ref}
MOOV_MERCHANT_CODE=...
MOOV_API_KEY=...
MOOV_API_SECRET=...
PAYMENT_WEBHOOK_SECRET=<le meme secret>
PAYMENT_CALLBACK_URL=https://ton-domaine/api/v1/payments/webhook/moov
```

⚠️ **L'API marchand Moov est déclinée par pays.** Je n'ai pas trouvé la
spécification Gabon : les chemins et le corps de requête sont donc entièrement
**configurables**, et le seul endroit à adapter si le format diffère est la
méthode `buildCollectBody()` dans `moov.provider.ts`.

### 3.4 En production

```env
PAYMENT_SANDBOX_ENABLED=false
NODE_ENV=production
```

Les endpoints de simulation (`/payments/sandbox/simulate`) sont alors refusés.

---

## 4. Ce que je n'ai PAS pu tester — à lire

**Je n'ai pas d'identifiants marchands, donc l'intégration réelle avec Airtel et
Moov n'a jamais été exécutée.** Ce qui est vérifié, c'est :

- ✅ tout le cycle de paiement contre le backend en marche, avec le fournisseur `SANDBOX` (43 vérifications, 0 échec) ;
- ✅ que l'authentification, le calcul serveur des montants, l'idempotence, le cloisonnement par utilisateur et le refus des webhooks non signés fonctionnent ;
- ✅ que les webhooks Airtel/Moov sont **refusés** sans secret (401) ;
- ✅ que la construction des interfaces (site et app) ne lève aucune erreur.

Ce qui **reste à valider avec les opérateurs** : l'URL et les chemins réels, le
format exact du corps, le nom des en-têtes de signature, et le comportement du
sandbox opérateur. Attends-toi à devoir ajuster `airtel.provider.ts` et
`moov.provider.ts` sur ces points — c'est prévu et isolé.

---

## 5. Failles corrigées (avant / après)

| Avant | Après |
|---|---|
| `/payments/initiate` **sans authentification** | `authenticate` obligatoire |
| **Montant fourni par le client** (`amount`) | Calculé depuis le RDV / la réservation / la formule |
| **Remise CNAMGS fournie par le client** (`applyCnamgs`) | Calculée serveur, selon l'éligibilité réelle du praticien et le numéro CNAMGS du patient |
| Statut `COMPLETED` **immédiat** | `PENDING` jusqu'au webhook de l'opérateur |
| **Repli local** qui fabriquait un paiement « payé » | Supprimé : un paiement passe par l'opérateur ou échoue |
| Référence via `Math.random()` | `crypto.randomBytes` |
| `/payments/history` exposait **tous** les paiements | Limité aux paiements de l'utilisateur connecté |
| `/payments/verify/:ref` accessible à tous | Vérifie que la transaction appartient au demandeur |
| Aucun webhook | Webhooks signés (HMAC-SHA256 ou secret partagé) |
| Pas d'idempotence | Un paiement en cours (< 10 min) est réutilisé ; un service déjà payé renvoie 409 |
| Le paiement d'un RDV appartenant à un autre était accepté | Vérification de propriété (403) |
| **Code PIN Mobile Money demandé dans l'app et le site** | Supprimé : le client valide chez son opérateur |

Le dernier point n'est pas cosmétique : demander un PIN Mobile Money dans une
application tierce est exactement la forme d'une attaque par harponnage, et les
opérateurs l'interdisent contractuellement.

---

## 6. Côté clients

| | Fichier | Changement |
|---|---|---|
| Site | `src/services/api.ts` | `initiatePayment({relatedTo, relatedId, phone, operator})` + `getPaymentStatus()` + `getPaymentHistory()` |
| Site | `src/components/PaymentModal.tsx` | 3 étapes : formulaire → **attente de validation** (suivi automatique + « Vérifier maintenant ») → reçu. PIN supprimé. Montants affichés depuis le serveur. |
| App | `services/api_client.py` | Même contrat ; **repli local supprimé** ; `get_payment_status()`, `get_payment_history()` |
| App | `components/payment_modal.py` | Même flux d'attente avec suivi en thread. PIN supprimé. |

---

## 7. Tester en mode simulation

```powershell
# 1. Backend (affiche l'etat des fournisseurs au demarrage)
cd "C:\Users\LENOVO\Downloads\Nouveau dossier (15)\elam\elam_backend"; npm run dev
```

Au démarrage, tu dois voir :

```
💳 Paiement Mobile Money — fournisseur actif : SANDBOX
   • SANDBOX       configuré ← ACTIF
   • AIRTEL_MONEY  NON configuré (identifiants absents)
   • MOOV_MONEY    NON configuré (identifiants absents)
⚠️  PAIEMENT EN MODE SIMULATION : aucune somme reelle n'est encaissee.
```

Le bac à sable confirme automatiquement le paiement ~6 s après la demande
(`SANDBOX_CONFIRM_AFTER_MS`), ce qui simule la validation sur le téléphone.
Pour tester un **échec** :

```powershell
POST /api/v1/payments/sandbox/simulate/<transactionRef>
{ "status": "FAILED", "reason": "Solde insuffisant" }
```

### Endpoints

| Méthode | Chemin | Auth | Rôle |
|---|---|---|---|
| POST | `/payments/initiate` | Bearer | Démarrer un paiement |
| GET | `/payments/verify/:ref` | Bearer | Suivre / rafraîchir l'état |
| GET | `/payments/history` | Bearer | Ses propres paiements |
| POST | `/payments/webhook/airtel` | signature | Confirmation Airtel |
| POST | `/payments/webhook/moov` | signature | Confirmation Moov |
| POST | `/payments/sandbox/simulate/:ref` | Bearer | Simulation (hors production) |

---

## 8. Étapes suivantes

1. **Contacter Airtel Gabon et Moov Africa Gabon Telecom** (§ 3.1) — c'est ce qui débloque tout le reste.
2. Renseigner les identifiants + `PAYMENT_WEBHOOK_SECRET` + `PAYMENT_CALLBACK_URL`.
3. Exposer le backend en HTTPS public (les opérateurs doivent pouvoir appeler le webhook).
4. Tester avec le **sandbox opérateur**, ajuster les chemins si besoin.
5. Passer `PAYMENT_PROVIDER` sur l'opérateur, puis désactiver `PAYMENT_SANDBOX_ENABLED`.
6. Mettre en place le **rapprochement** (T+1) : comparer tes paiements `COMPLETED` au relevé de l'opérateur.
