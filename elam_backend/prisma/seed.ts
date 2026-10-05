import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Nettoyage et initialisation des données ELAM Gabon...');

  await prisma.review.deleteMany();
  await prisma.medicationReservation.deleteMany();
  await prisma.pharmacyStock.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.favoriteDoctor.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.pharmacyProfile.deleteMany();
  await prisma.clinicProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. ADMIN USER
  await prisma.user.create({
    data: {
      email: 'admin@elam.ga',
      phone: '+24101000000',
      passwordHash,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'ELAM',
    },
  });

  // 2. PATIENTS
  const patientUser = await prisma.user.create({
    data: {
      email: 'patient.hans@elam.ga',
      phone: '+24107695040',
      passwordHash,
      role: 'PATIENT',
      firstName: 'Hans',
      lastName: 'Mba Ndong',
      patientProfile: {
        create: {
          gender: 'M',
          city: 'Libreville',
          district: 'Akanda',
          address: 'Okala Carrière',
          cnamgsNumber: 'GA-2024-98472-CNAMGS',
        },
      },
    },
    include: { patientProfile: true },
  });

  // 3. MEDICATIONS CATALOG
  const medAmoxicilline = await prisma.medication.create({
    data: {
      name: 'Amoxicilline 500mg',
      genericName: 'Amoxicilline trihydratée',
      category: 'Antibiotique',
      form: 'Gélule',
      dosage: '500mg',
      requiresPrescription: true,
      codeCnamgs: 'CNAMGS-MED-012',
      description: 'Antibiotique de la famille des bêta-lactamines pour infections ORL et pulmonaires.',
    },
  });

  const medDoliprane = await prisma.medication.create({
    data: {
      name: 'Doliprane 1000mg',
      genericName: 'Paracétamol',
      category: 'Antalgique / Antipyrétique',
      form: 'Comprimé effervescent',
      dosage: '1000mg',
      requiresPrescription: false,
      codeCnamgs: 'CNAMGS-MED-001',
      description: 'Soulage les douleurs d\'intensité légère à modérée et/ou états fébriles.',
    },
  });

  const medCoartem = await prisma.medication.create({
    data: {
      name: 'Coartem 80/480mg',
      genericName: 'Artéméther / Luméfantrine',
      category: 'Antipaludéen',
      form: 'Comprimé',
      dosage: '80/480mg',
      requiresPrescription: true,
      codeCnamgs: 'CNAMGS-MED-044',
      description: 'Traitement de première intention des accès palustres simples à Plasmodium falciparum.',
    },
  });

  const medVentoline = await prisma.medication.create({
    data: {
      name: 'Ventoline 100µg/dose',
      genericName: 'Salbutamol',
      category: 'Pneumologie / Bronchodilatateur',
      form: 'Aérosol-doseur',
      dosage: '100µg',
      requiresPrescription: true,
      codeCnamgs: 'CNAMGS-MED-035',
      description: 'Traitement symptomatique des crises d\'asthme et des bronchospasmes.',
    },
  });

  const medAmlodipine = await prisma.medication.create({
    data: {
      name: 'Amlor 5mg',
      genericName: 'Amlodipine',
      category: 'Cardiologie / Antihypertenseur',
      form: 'Gélule',
      dosage: '5mg',
      requiresPrescription: true,
      codeCnamgs: 'CNAMGS-MED-088',
      description: 'Inhibiteur calcique indiqué dans le traitement de l\'hypertension artérielle.',
    },
  });

  // 4. PHARMACIES
  // Pharmacie 1: De garde à Barracuda
  const pharmUser1 = await prisma.user.create({
    data: {
      email: 'contact@pharmacie-saint-antoine.ga',
      phone: '+24174335777',
      passwordHash,
      role: 'PHARMACY',
      firstName: 'Dr Franck',
      lastName: 'Chambrier',
      pharmacyProfile: {
        create: {
          name: 'Pharmacie Saint Antoine',
          licenseNumber: 'BP1063',
          address: 'Barracuda',
          city: 'Libreville',
          district: 'Barracuda',
          latitude: 0.4162,
          longitude: 9.4673,
          phone: '+241 74 33 57 77',
          emergencyPhone: '+241 04 33 57 77',
          openingHours: 'Pharmacie de garde',
          isOnDuty: true,
          onDutyUntil: new Date(Date.now() + 5 * 24 * 3600 * 1000),
          acceptsCnamgs: false,
          verificationStatus: 'VERIFIED',
          rating: 5,
          reviewCount: 0,
        },
      },
    },
    include: { pharmacyProfile: true },
  });

  // Pharmacie 2: Centre-ville
  const pharmUser2 = await prisma.user.create({
    data: {
      email: 'contact@pharmacie-poste.ga',
      phone: '+24111720330',
      passwordHash,
      role: 'PHARMACY',
      firstName: 'Directeur',
      lastName: 'Pharmacie de la Poste',
      pharmacyProfile: {
        create: {
          name: 'Pharmacie de la Poste',
          licenseNumber: 'A-CONFIRMER',
          address: 'Centre-ville',
          city: 'Libreville',
          district: 'Centre-ville',
          latitude: 0.3924,
          longitude: 9.4542,
          phone: '+241 11 72 03 30',
          openingHours: 'Pharmacie de garde',
          isOnDuty: true,
          acceptsCnamgs: false,
          verificationStatus: 'VERIFIED',
          rating: 5,
          reviewCount: 0,
        },
      },
    },
    include: { pharmacyProfile: true },
  });

  // Pharmacie 3: Glass
  const pharmUser3 = await prisma.user.create({
    data: {
      email: 'contact@pharmacie-forestiers.ga',
      phone: '+24111722352',
      passwordHash,
      role: 'PHARMACY',
      firstName: 'Directeur',
      lastName: 'Pharmacie Les Forestiers',
      pharmacyProfile: {
        create: {
          name: 'Pharmacie Les Forestiers',
          licenseNumber: 'A-CONFIRMER',
          address: 'Glass',
          city: 'Libreville',
          district: 'Glass',
          latitude: 0.3789,
          longitude: 9.4485,
          phone: '+241 11 72 23 52 / +241 66 66 71 71 / +241 66 27 41 01',
          openingHours: 'Pharmacie de garde',
          isOnDuty: true,
          acceptsCnamgs: false,
          verificationStatus: 'VERIFIED',
          rating: 5,
          reviewCount: 0,
        },
      },
    },
    include: { pharmacyProfile: true },
  });

  // STOCKS PHARMACIES
  if (pharmUser1.pharmacyProfile) {
    await prisma.pharmacyStock.createMany({
      data: [
        {
          pharmacyId: pharmUser1.pharmacyProfile.id,
          medicationId: medAmoxicilline.id,
          status: 'IN_STOCK',
          quantity: 45,
          priceFcfa: 3500,
          lastVerifiedAt: new Date(Date.now() - 15 * 60 * 1000), // il y a 15 min
        },
        {
          pharmacyId: pharmUser1.pharmacyProfile.id,
          medicationId: medDoliprane.id,
          status: 'IN_STOCK',
          quantity: 120,
          priceFcfa: 1800,
          lastVerifiedAt: new Date(Date.now() - 8 * 60 * 1000),
        },
        {
          pharmacyId: pharmUser1.pharmacyProfile.id,
          medicationId: medCoartem.id,
          status: 'IN_STOCK',
          quantity: 28,
          priceFcfa: 4200,
          lastVerifiedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          pharmacyId: pharmUser1.pharmacyProfile.id,
          medicationId: medVentoline.id,
          status: 'LOW_STOCK',
          quantity: 3,
          priceFcfa: 4900,
          lastVerifiedAt: new Date(Date.now() - 50 * 60 * 1000),
        },
      ],
    });
  }

  if (pharmUser2.pharmacyProfile) {
    await prisma.pharmacyStock.createMany({
      data: [
        {
          pharmacyId: pharmUser2.pharmacyProfile.id,
          medicationId: medAmoxicilline.id,
          status: 'IN_STOCK',
          quantity: 60,
          priceFcfa: 3400,
          lastVerifiedAt: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          pharmacyId: pharmUser2.pharmacyProfile.id,
          medicationId: medDoliprane.id,
          status: 'IN_STOCK',
          quantity: 80,
          priceFcfa: 1750,
          lastVerifiedAt: new Date(Date.now() - 12 * 60 * 1000),
        },
        {
          pharmacyId: pharmUser2.pharmacyProfile.id,
          medicationId: medAmlodipine.id,
          status: 'IN_STOCK',
          quantity: 22,
          priceFcfa: 5600,
          lastVerifiedAt: new Date(Date.now() - 40 * 60 * 1000),
        },
      ],
    });
  }

  // 5. DOCTORS / SPECIALISTS
  // Médecin généraliste au PK9
  const docUser1 = await prisma.user.create({
    data: {
      email: 'dr.damas.aboghe@elam.ga',
      phone: '+24177850041',
      passwordHash,
      role: 'DOCTOR',
      firstName: 'Damas',
      lastName: 'Aboghe',
      doctorProfile: {
        create: {
          cnomNumber: 'A-CONFIRMER',
          title: 'Dr.',
          specialty: 'Médecine Générale',
          subSpecialties: 'Consultation médicale, suivi des patients, soins et pansements',
          bio: 'Médecin généraliste au Cabinet Médical du PK9. Consultation sans assurance.',
          experienceYears: 0,
          consultationFee: 7500,
          acceptsCnamgs: false,
          acceptsTeleconsult: false,
          acceptsHomeVisit: false,
          address: 'Cabinet Médical du PK9, après la brigade du PK9',
          city: 'Libreville',
          district: 'PK9',
          latitude: 0.4475,
          longitude: 9.4328,
          rating: 5,
          reviewCount: 0,
          verificationStatus: 'VERIFIED',
          availabilities: {
            create: [
              { dayOfWeek: 1, startTime: '08:00', endTime: '20:00', slotDurationMinutes: 30 },
              { dayOfWeek: 2, startTime: '08:00', endTime: '20:00', slotDurationMinutes: 30 },
              { dayOfWeek: 3, startTime: '08:00', endTime: '20:00', slotDurationMinutes: 30 },
              { dayOfWeek: 4, startTime: '08:00', endTime: '20:00', slotDurationMinutes: 30 },
              { dayOfWeek: 5, startTime: '08:00', endTime: '20:00', slotDurationMinutes: 30 },
              { dayOfWeek: 6, startTime: '08:00', endTime: '20:00', slotDurationMinutes: 30 },
              { dayOfWeek: 0, startTime: '08:00', endTime: '20:00', slotDurationMinutes: 30 },
            ],
          },
        },
      },
    },
    include: { doctorProfile: true },
  });

  // 6. CLINICS & HOSPITALS (Urgences 24/7)
  const clinicUser1 = await prisma.user.create({
    data: {
      email: 'urgences@chulibreville.ga',
      phone: '+24111762000',
      passwordHash,
      role: 'CLINIC',
      firstName: 'Administration',
      lastName: 'CHUL',
      clinicProfile: {
        create: {
          name: 'Centre Hospitalier Universitaire de Libreville (CHUL)',
          type: 'HOSPITAL',
          address: 'Boulevard de l\'Indépendance',
          city: 'Libreville',
          district: 'Centre-ville',
          latitude: 0.391,
          longitude: 9.449,
          phone: '+241 11 76 20 00',
          emergencyPhone247: '1300',
          hasEmergency247: true,
          acceptsCnamgs: true,
          services: JSON.stringify([
            'Urgences 24/7',
            'Service de Réanimation',
            'Cardiologie',
            'Chirurgie Générale',
            'Maternité & Gynécologie',
            'Laboratoire d\'analyses médicales',
            'Imagerie / Scanner / Radiologie',
          ]),
          verificationStatus: 'VERIFIED',
        },
      },
    },
  });

  const clinicUser2 = await prisma.user.create({
    data: {
      email: 'accueil@elrapha.ga',
      phone: '+24111737373',
      passwordHash,
      role: 'CLINIC',
      firstName: 'Accueil',
      lastName: 'Polyclinique El Rapha',
      clinicProfile: {
        create: {
          name: 'Polyclinique El Rapha',
          type: 'CLINIC',
          address: 'Carrefour Angondjé, Voie Express',
          city: 'Libreville',
          district: 'Akanda',
          latitude: 0.5289,
          longitude: 9.4345,
          phone: '+241 11 73 73 73',
          emergencyPhone247: '+241 07 20 20 20',
          hasEmergency247: true,
          acceptsCnamgs: true,
          services: JSON.stringify([
            'Urgences 24/7',
            'Scanner & IRM',
            'Laboratoire d\'analyses 24/7',
            'Bloc opératoire',
            'Pédiatrie & Maternité',
            'Ambulance SAMU',
          ]),
          verificationStatus: 'VERIFIED',
        },
      },
    },
  });

  const clinicUser3 = await prisma.user.create({
    data: {
      email: 'contact@croix-rouge.ga',
      phone: '+24111769054',
      passwordHash,
      role: 'CLINIC',
      firstName: 'Contact',
      lastName: 'Croix-Rouge Gabonaise',
      clinicProfile: {
        create: {
          name: 'Croix-Rouge Gabonaise',
          type: 'HEALTH_ORGANIZATION',
          address: 'Derrière l\'hôtel Le Cristal',
          city: 'Libreville',
          district: 'Centre-ville',
          latitude: 0.391,
          longitude: 9.451,
          phone: '+241 11 76 90 54',
          hasEmergency247: false,
          acceptsCnamgs: false,
          services: JSON.stringify([
            'BP 2274 Libreville',
            'Assistance humanitaire',
            'Premiers secours',
            'Mail: contact@croix-rouge.ga',
          ]),
          verificationStatus: 'VERIFIED',
        },
      },
    },
  });

  // 7. SUBSCRIPTIONS
  if (docUser1.id) {
    await prisma.subscription.create({
      data: {
        userId: docUser1.id,
        planType: 'DOCTOR_PRO',
        status: 'ACTIVE',
        priceFcfa: 10000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  }

  if (pharmUser1.id) {
    await prisma.subscription.create({
      data: {
        userId: pharmUser1.id,
        planType: 'PHARMACY_PRO',
        status: 'ACTIVE',
        priceFcfa: 15000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  }

  console.log('✅ Base de données ELAM Gabon initialisée avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
