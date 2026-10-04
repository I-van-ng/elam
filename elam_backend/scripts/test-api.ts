import { createApp } from '../src/app.js';
import http from 'http';

async function runTests() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(5099, () => {
      console.log('🧪 Serveur de test démarré sur le port 5099');
      resolve();
    });
  });

  const baseUrl = 'http://localhost:5099';
  let passed = 0;
  let failed = 0;

  async function assert(desc: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${desc}:`, err.message);
      failed++;
    }
  }

  console.log('\n--- 1. TEST HEALTHCHECK ---');
  await assert('GET /health renvoie le statut healthy', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const json = await res.json();
    if (json.status !== 'healthy' || json.country !== 'Gabon') {
      throw new Error(`Unexpected body: ${JSON.stringify(json)}`);
    }
  });

  console.log('\n--- 2. TEST AUTHENTIFICATION ---');
  let patientToken = '';
  let doctorToken = '';

  await assert('POST /api/v1/auth/login pour le patient Hans Mba Ndong', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhone: 'patient.hans@elam.ga',
        password: 'Password123!',
      }),
    });
    const json = await res.json();
    if (!json.success || !json.data.token) {
      throw new Error(json.error || 'Pas de token reçu');
    }
    patientToken = json.data.token;
  });

  await assert('POST /api/v1/auth/login pour le Dr. Alain Minko (Cardiologue)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhone: 'dr.minko@elam.ga',
        password: 'Password123!',
      }),
    });
    const json = await res.json();
    if (!json.success || !json.data.token) {
      throw new Error(json.error || 'Pas de token reçu');
    }
    doctorToken = json.data.token;
  });

  console.log('\n--- 3. TEST PHARMACIES & DISPONIBILITÉ MÉDICAMENTS ---');
  await assert('GET /api/v1/pharmacies (filtre de garde)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/pharmacies?isOnDuty=true&lat=0.5182&lng=9.4215`);
    const json = await res.json();
    if (!json.success || json.data.length === 0) {
      throw new Error('Aucune pharmacie de garde trouvée');
    }
    if (!json.data[0].isOnDuty) {
      throw new Error('La pharmacie renvoyée n\'est pas de garde');
    }
  });

  await assert('GET /api/v1/pharmacies/medications/search?q=Amoxicilline', async () => {
    const res = await fetch(`${baseUrl}/api/v1/pharmacies/medications/search?q=Amoxicilline&lat=0.5182&lng=9.4215`);
    const json = await res.json();
    if (!json.success || json.data.length === 0) {
      throw new Error('Médicament Amoxicilline introuvable');
    }
    const offers = json.data[0].offers;
    if (offers.length === 0 || !offers[0].freshness) {
      throw new Error('Offres ou indice de fraîcheur manquant');
    }
  });

  console.log('\n--- 4. TEST MÉDECINS & RENDEZ-VOUS ---');
  let doctorId = '';
  await assert('GET /api/v1/doctors?specialty=Cardiologie', async () => {
    const res = await fetch(`${baseUrl}/api/v1/doctors?specialty=Cardiologie`);
    const json = await res.json();
    if (!json.success || json.data.length === 0) {
      throw new Error('Aucun cardiologue trouvé');
    }
    doctorId = json.data[0].id;
  });

  await assert('POST /api/v1/appointments (Prise de RDV patient)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctorId,
        appointmentDate: '2026-11-20',
        startTime: '16:00',
        endTime: '16:30',
        type: 'IN_PERSON',
        reason: 'Contrôle tensionnel semestriel',
      }),
    });
    const json = await res.json();
    if (!json.success || !json.data.id) {
      throw new Error(json.error || 'Échec création rendez-vous');
    }
  });

  console.log('\n--- 5. TEST CLINIQUE & URGENCES 24/7 ---');
  await assert('GET /api/v1/clinics?hasEmergency247=true', async () => {
    const res = await fetch(`${baseUrl}/api/v1/clinics?hasEmergency247=true`);
    const json = await res.json();
    if (!json.success || json.data.length === 0) {
      throw new Error('Aucune clinique d\'urgence trouvée');
    }
  });

  console.log('\n--- 6. TEST MOTEUR "WAZE DE LA SANTÉ" ---');
  await assert('GET /api/v1/search/nearby (Recherche agrégée autour d\'Akanda)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/search/nearby?lat=0.5182&lng=9.4215&radiusKm=20&query=Amoxicilline`);
    const json = await res.json();
    if (!json.success || !json.data.results) {
      throw new Error('Réponse Waze Santé invalide');
    }
    if (json.data.results.pharmacies.length === 0) {
      throw new Error('Aucune pharmacie dans le résultat Waze Santé');
    }
  });

  console.log('\n--- 8. TEST PAIEMENT MOBILE MONEY GABON (AIRTEL & MOOV) ---');
  let testTxnRef = '';
  await assert('POST /api/v1/payments/initiate (Paiement consultation avec calcul CNAMGS 80%)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 25000,
        phone: '+241 074 12 34 56',
        operator: 'AIRTEL_MONEY',
        relatedTo: 'APPOINTMENT',
        relatedId: 'test-apt-id-123',
        applyCnamgs: true,
      }),
    });
    const json = await res.json();
    if (!json.success || !json.data.receipt || json.data.receipt.netPaid !== 5000) {
      throw new Error(`Paiement ou calcul CNAMGS invalide: ${JSON.stringify(json)}`);
    }
    testTxnRef = json.data.receipt.transactionRef;
  });

  await assert('GET /api/v1/payments/verify/:transactionRef', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payments/verify/${testTxnRef}`);
    const json = await res.json();
    if (!json.success || json.data.amount !== 5000) {
      throw new Error(`Vérification de paiement échouée: ${JSON.stringify(json)}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`🎯 RÉSULTATS DES TESTS : ${passed} passés, ${failed} échoués`);
  console.log(`========================================\n`);

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
