import { prisma } from '../config/prisma.js';
import { PlanType, SubscriptionStatus } from '../types/enums.js';

export const SUBSCRIPTION_PLANS = [
  {
    planType: PlanType.FREE,
    name: 'Patient & Gratuit',
    priceFcfa: 0,
    interval: 'MONTHLY',
    targetRole: 'PATIENT',
    features: [
      'Accès gratuit illimité',
      'Recherche de pharmacies & gardes',
      'Disponibilité des médicaments avec fraîcheur des stocks',
      'Recherche de médecins par spécialité',
      'Prise de rendez-vous en ligne',
      'Orientation vers hôpitaux & cliniques d\'urgence',
    ],
  },
  {
    planType: PlanType.DOCTOR_BASIC,
    name: 'Médecin Indépendant Basic',
    priceFcfa: 5000,
    interval: 'MONTHLY',
    targetRole: 'DOCTOR',
    features: [
      'Profil professionnel vérifié CNOM / e-CPS',
      'Visibilité dans les recherches par spécialité et localisation',
      'Affichage des horaires et coordonnées du cabinet',
      'Agenda numérique et prise de rendez-vous',
      'Gestion des disponibilités',
    ],
  },
  {
    planType: PlanType.DOCTOR_PRO,
    name: 'Médecin PRO & Téléconsultation',
    priceFcfa: 10000,
    interval: 'MONTHLY',
    targetRole: 'DOCTOR',
    features: [
      'Tout le forfait Basic',
      'Module de Téléconsultation médicale sécurisée',
      'Badge Médecin Partenaire Vérifié',
      'Gestion de l\'historique des consultations et dossiers',
      'Rappels automatiques par SMS/WhatsApp aux patients',
      'Statistiques d\'activité et acquisition patient',
      'Visibilité prioritaire en haut des résultats',
    ],
  },
  {
    planType: PlanType.PHARMACY_BASIC,
    name: 'Pharmacie BASIC',
    priceFcfa: 0,
    interval: 'MONTHLY',
    targetRole: 'PHARMACY',
    features: [
      'Fiche officielle (adresse, téléphone, horaires)',
      'Statut ouvert / fermé',
      'Indication des semaines de garde',
      'Référencement sur la carte interactive',
    ],
  },
  {
    planType: PlanType.PHARMACY_PRO,
    name: 'Pharmacie PRO - Gestion des Stocks',
    priceFcfa: 15000,
    interval: 'MONTHLY',
    targetRole: 'PHARMACY',
    features: [
      'Tout le forfait BASIC',
      'Mise à jour en temps réel des stocks de médicaments',
      'Réception et traitement des réservations d\'ordonnances',
      'Badge Officine Réactive Vérifiée',
      'Statistiques sur les médicaments les plus recherchés par quartier',
    ],
  },
  {
    planType: PlanType.PHARMACY_PREMIUM,
    name: 'Pharmacie PREMIUM & Intégration',
    priceFcfa: 30000,
    interval: 'MONTHLY',
    targetRole: 'PHARMACY',
    features: [
      'Tout le forfait PRO',
      'Comptes multi-utilisateurs pour les préparateurs',
      'Connexion API au logiciel de gestion de stock de l\'officine',
      'Visibilité sponsorisée pour les campagnes de prévention',
      'Support prioritaire 7j/7',
    ],
  },
  {
    planType: PlanType.CLINIC_STANDARD,
    name: 'Cabinet / Clinique Médicale',
    priceFcfa: 35000,
    interval: 'MONTHLY',
    targetRole: 'CLINIC',
    features: [
      'Fiche établissement multi-spécialités',
      'Gestion de plusieurs praticiens et agendas groupés',
      'Mise en avant des urgences 24/7 et du laboratoire',
      'Prise de rendez-vous centralisée',
    ],
  },
  {
    planType: PlanType.ENTERPRISE,
    name: 'Pack Santé Entreprise',
    priceFcfa: 150000,
    interval: 'YEARLY',
    targetRole: 'ENTERPRISE',
    features: [
      'Couverture d\'accès santé prioritaire pour tous les salariés',
      'Orientation médicale d\'entreprise',
      'Tableau de bord RH et suivi de prévention',
    ],
  },
];

export class SubscriptionService {
  static getAvailablePlans() {
    return SUBSCRIPTION_PLANS;
  }

  static async getUserSubscription(userId: string) {
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) {
      return {
        planType: PlanType.FREE,
        status: SubscriptionStatus.ACTIVE,
        name: 'Gratuit',
        priceFcfa: 0,
      };
    }

    const planInfo = SUBSCRIPTION_PLANS.find((p) => p.planType === activeSub.planType);
    return {
      ...activeSub,
      planDetails: planInfo,
    };
  }

  static async subscribeToPlan(userId: string, planType: PlanType, autoRenew = true) {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.planType === planType);
    if (!plan) {
      throw new Error('Plan d\'abonnement invalide');
    }

    // Désactiver les anciens abonnements actifs
    await prisma.subscription.updateMany({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const startDate = new Date();
    const endDate = new Date();
    if (plan.interval === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return await prisma.subscription.create({
      data: {
        userId,
        planType,
        status: SubscriptionStatus.ACTIVE,
        priceFcfa: plan.priceFcfa,
        startDate,
        endDate,
        autoRenew,
      },
    });
  }
}
