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
  // Pharmacie 1: De Garde à Akanda
  const pharmUser1 = await prisma.user.create({
    data: {
      email: 'contact@pharmacie-okala.ga',
      phone: '+24111738290',
      passwordHash,
      role: 'PHARMACY',
      firstName: 'Directeur',
      lastName: 'Pharmacie Okala',
      pharmacyProfile: {
        create: {
          name: 'Pharmacie d\'Okala',
          licenseNumber: 'OFF-GA-2018-091',
          address: 'Route Nationale 1, face Station Shell Okala',
          city: 'Libreville',
          district: 'Akanda',
          latitude: 0.5182,
          longitude: 9.4215,
          phone: '+241 11 73 82 90',
          emergencyPhone: '+241 07 44 22 11',
          openingHours: '24h/24 (Semaine de Garde)',
          isOnDuty: true,
          onDutyUntil: new Date(Date.now() + 5 * 24 * 3600 * 1000),
          acceptsCnamgs: true,
          verificationStatus: 'VERIFIED',
          rating: 4.8,
          reviewCount: 26,
        },
      },
    },
    include: { pharmacyProfile: true },
  });

  // Pharmacie 2: Centre-ville
  const pharmUser2 = await prisma.user.create({
    data: {
      email: 'contact@pharmacie-stemarie.ga',
      phone: '+24111762345',
      passwordHash,
      role: 'PHARMACY',
      firstName: 'Dr. Jeanne',
      lastName: 'Obame',
      pharmacyProfile: {
        create: {
          name: 'Grande Pharmacie Sainte-Marie',
          licenseNumber: 'OFF-GA-2012-014',
          address: 'Boulevard Triomphal Omar Bongo',
          city: 'Libreville',
          district: 'Centre-ville',
          latitude: 0.3924,
          longitude: 9.4542,
          phone: '+241 11 76 23 45',
          emergencyPhone: '+241 06 88 12 34',
          openingHours: '07h30 - 21h30',
          isOnDuty: false,
          acceptsCnamgs: true,
          verificationStatus: 'VERIFIED',
          rating: 4.9,
          reviewCount: 54,
        },
      },
    },
    include: { pharmacyProfile: true },
  });

  // Pharmacie 3: Glass
  const pharmUser3 = await prisma.user.create({
    data: {
      email: 'contact@pharmacie-forestiers.ga',
      phone: '+24111721098',
      passwordHash,
      role: 'PHARMACY',
      firstName: 'Dr. Patrick',
      lastName: 'Mba',
      pharmacyProfile: {
        create: {
          name: 'Pharmacie des Forestiers',
          licenseNumber: 'OFF-GA-2015-055',
          address: 'Carrefour Glass, Avenue de Cointet',
          city: 'Libreville',
          district: 'Glass',
          latitude: 0.3789,
          longitude: 9.4485,
          phone: '+241 11 72 10 98',
          openingHours: '08h00 - 20h00',
          isOnDuty: false,
          acceptsCnamgs: true,
          verificationStatus: 'VERIFIED',
          rating: 4.6,
          reviewCount: 19,
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
  // Cardiologue à Glass
  const docUser1 = await prisma.user.create({
    data: {
      email: 'dr.minko@elam.ga',
      phone: '+24107112233',
      passwordHash,
      role: 'DOCTOR',
      firstName: 'Alain',
      lastName: 'Minko',
      doctorProfile: {
        create: {
          cnomNumber: 'CNOM-GA-2014-0412',
          title: 'Dr.',
          specialty: 'Cardiologie',
          subSpecialties: 'Échocardiographie, Hypertension artérielle, Insuffisance cardiaque',
          bio: 'Spécialiste des pathologies cardiovasculaires avec 14 ans d\'expérience au Gabon et à l\'international.',
          experienceYears: 14,
          consultationFee: 25000,
          acceptsCnamgs: true,
          acceptsTeleconsult: true,
          acceptsHomeVisit: false,
          address: 'Cabinet Médical du Littoral, Glass',
          city: 'Libreville',
          district: 'Glass',
          latitude: 0.3801,
          longitude: 9.4472,
          rating: 4.9,
          reviewCount: 42,
          verificationStatus: 'VERIFIED',
          availabilities: {
            create: [
              { dayOfWeek: 1, startTime: '08:30', endTime: '16:30', slotDurationMinutes: 30 },
              { dayOfWeek: 2, startTime: '08:30', endTime: '16:30', slotDurationMinutes: 30 },
              { dayOfWeek: 3, startTime: '08:30', endTime: '16:30', slotDurationMinutes: 30 },
              { dayOfWeek: 4, startTime: '08:30', endTime: '16:30', slotDurationMinutes: 30 },
              { dayOfWeek: 5, startTime: '08:30', endTime: '14:00', slotDurationMinutes: 30 },
            ],
          },
        },
      },
    },
    include: { doctorProfile: true },
  });

  // Pédiatre à Akanda
  const docUser2 = await prisma.user.create({
    data: {
      email: 'dr.nzamba@elam.ga',
      phone: '+24106554433',
      passwordHash,
      role: 'DOCTOR',
      firstName: 'Sylvie',
      lastName: 'Nzamba',
      doctorProfile: {
        create: {
          cnomNumber: 'CNOM-GA-2016-0789',
          title: 'Dr.',
          specialty: 'Pédiatrie',
          subSpecialties: 'Néonatologie, Suivi du nourrisson, Vaccinations',
          bio: 'Pédiatre passionnée par la santé infantile et le développement de l\'enfant.',
          experienceYears: 10,
          consultationFee: 20000,
          acceptsCnamgs: true,
          acceptsTeleconsult: true,
          acceptsHomeVisit: true,
          address: 'Centre Médical d\'Angondjé, Akanda',
          city: 'Libreville',
          district: 'Akanda',
          latitude: 0.5255,
          longitude: 9.4312,
          rating: 5.0,
          reviewCount: 58,
          verificationStatus: 'VERIFIED',
          availabilities: {
            create: [
              { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
              { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
              { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
              { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
              { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
              { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
            ],
          },
        },
      },
    },
    include: { doctorProfile: true },
  });

  // Médecin Généraliste au Centre-ville
  const docUser3 = await prisma.user.create({
    data: {
      email: 'dr.bekale@elam.ga',
      phone: '+24107889900',
      passwordHash,
      role: 'DOCTOR',
      firstName: 'Christian',
      lastName: 'Bekale',
      doctorProfile: {
        create: {
          cnomNumber: 'CNOM-GA-2011-0156',
          title: 'Dr.',
          specialty: 'Médecine Générale',
          subSpecialties: 'Bilan de santé, Médecine préventive, Paludisme et maladies infectieuses',
          bio: 'Médecin généraliste à l\'écoute pour tout motif médical d\'adulte et d\'enfant.',
          experienceYears: 16,
          consultationFee: 15000,
          acceptsCnamgs: true,
          acceptsTeleconsult: false,
          acceptsHomeVisit: true,
          address: 'Avenue de la Nation, Montagne Sainte',
          city: 'Libreville',
          district: 'Centre-ville',
          latitude: 0.395,
          longitude: 9.451,
          rating: 4.7,
          reviewCount: 31,
          verificationStatus: 'VERIFIED',
          availabilities: {
            create: [
              { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', slotDurationMinutes: 20 },
              { dayOfWeek: 2, startTime: '08:00', endTime: '18:00', slotDurationMinutes: 20 },
              { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', slotDurationMinutes: 20 },
              { dayOfWeek: 4, startTime: '08:00', endTime: '18:00', slotDurationMinutes: 20 },
              { dayOfWeek: 5, startTime: '08:00', endTime: '18:00', slotDurationMinutes: 20 },
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
