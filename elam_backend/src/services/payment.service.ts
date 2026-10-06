import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { ENV } from '../config/env.js';
import { getProviderFor, airtelProvider, moovProvider, sandboxProvider, PaymentOperator, PaymentStatus } from './payments/index.js';
import { ProviderConfigError } from './payments/types.js';
import { SubscriptionService } from './subscription.service.js';
import { PlanType } from '../types/enums.js';

export type RelatedTo = 'APPOINTMENT' | 'RESERVATION' | 'SUBSCRIPTION';

export interface InitiateInput {
  relatedTo: RelatedTo;
  relatedId: string;
  phone: string;
  /** Operateur declare par le client ; on le VERIFIE contre le numero. */
  operator?: PaymentOperator;
}

export interface InitiateResult {
  payment: {
    id: string;
    transactionRef: string;
    status: string;
    amount: number;
    cnamgsCovered: number;
    patientAmount: number;
    currency: string;
    operator: string;
    phone: string;
    provider: string;
    providerRef: string | null;
  };
  instructions?: string;
}

/** Levee quand la demande est invalide (400) ou interdite (403). */
export class PaymentError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'PaymentError';
    this.statusCode = statusCode;
  }
}

/**
 * Detecte l'operateur a partir du numero gabonais.
 * Airtel : 074, 076, 077, 011 — Moov : 062, 065, 066.
 */
export function detectOperator(phone: string): PaymentOperator {
  const local = (phone || '')
    .replace(/\D/g, '')
    .replace(/^241/, '')
    .replace(/^0/, '');

  if (['74', '76', '77', '11'].some((p) => local.startsWith(p))) return 'AIRTEL_MONEY';
  if (['62', '65', '66'].some((p) => local.startsWith(p))) return 'MOOV_MONEY';

  throw new PaymentError(
    'Numero Mobile Money non reconnu. Airtel Money : 074 / 076 / 077 / 011. Moov Money : 062 / 065 / 066.'
  );
}

export class PaymentService {
  // ======================================================================
  // 1. Demarrage d'un paiement
  // ======================================================================
  static async initiate(userId: string, input: InitiateInput): Promise<InitiateResult> {
    const relatedTo = String(input.relatedTo || '').toUpperCase() as RelatedTo;
    if (!['APPOINTMENT', 'RESERVATION', 'SUBSCRIPTION'].includes(relatedTo)) {
      throw new PaymentError('Type de paiement non pris en charge.');
    }
    if (!input.relatedId) {
      throw new PaymentError('Reference du service a payer manquante.');
    }

    const phone = String(input.phone || '').trim();
    if (!phone) {
      throw new PaymentError('Numero de telephone requis.');
    }

    // --- L'operateur est deduit du numero, jamais impose par le client ---
    const detectedOperator = detectOperator(phone);
    if (input.operator && input.operator !== detectedOperator) {
      const nom = detectedOperator === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Moov Money';
      throw new PaymentError(`Ce numero correspond a ${nom}, pas a l'operateur choisi.`);
    }

    // --- Montant calcule COTE SERVEUR ---
    const pricing = await this.resolvePricing(userId, relatedTo, input.relatedId);

    // --- Deja paye ? ---
    const alreadyPaid = await prisma.payment.findFirst({
      where: { relatedTo, relatedId: input.relatedId, status: 'COMPLETED' },
    });
    if (alreadyPaid) {
      throw new PaymentError('Ce service a deja ete paye.', 409);
    }

    // --- Idempotence : on reutilise un paiement en cours recent ---
    const pending = await prisma.payment.findFirst({
      where: {
        relatedTo,
        relatedId: input.relatedId,
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      return { payment: this.serialize(pending), instructions: 'Paiement deja en cours : validez sur votre telephone.' };
    }

    const provider = getProviderFor(detectedOperator);
    const transactionRef = this.generateReference(detectedOperator);

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: pricing.amount,
        cnamgsCovered: pricing.cnamgsCovered,
        patientAmount: pricing.patientAmount,
        currency: pricing.currency,
        provider: provider.name,
        operator: detectedOperator,
        phone,
        transactionRef,
        status: 'PENDING',
        relatedTo,
        relatedId: input.relatedId,
      },
    });

    // --- Appel a l'operateur ---
    try {
      const result = await provider.requestCollection({
        transactionRef,
        amount: pricing.patientAmount,
        currency: pricing.currency,
        phone,
        operator: detectedOperator,
        description: pricing.description,
      });

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerRef: result.providerRef ?? null,
          status: result.accepted ? 'PENDING' : 'FAILED',
          failureReason: result.accepted ? null : result.errorMessage ?? 'Demande refusee par l\'operateur.',
          rawCallback: result.raw ? JSON.stringify(result.raw) : null,
        },
      });

      if (!result.accepted) {
        throw new PaymentError(result.errorMessage || 'La demande de paiement a ete refusee.', 502);
      }

      return { payment: this.serialize(updated), instructions: result.instructions };
    } catch (error) {
      if (error instanceof ProviderConfigError) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: error.message },
        });
        throw new PaymentError(error.message, 503);
      }
      if (error instanceof PaymentError) throw error;

      const message = error instanceof Error ? error.message : 'Erreur de communication avec l\'operateur.';
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: message },
      });
      throw new PaymentError(message, 502);
    }
  }

  // ======================================================================
  // 2. Tarification : tout est resolu cote serveur
  // ======================================================================
  private static async resolvePricing(userId: string, relatedTo: RelatedTo, relatedId: string) {
    let amount = 0;
    let cnamgsEligible = false;
    let description = 'Paiement ELAM';
    let patientHasCnamgs = false;

    if (relatedTo === 'APPOINTMENT') {
      const appointment = await prisma.appointment.findUnique({
        where: { id: relatedId },
        include: { patient: true, doctor: true },
      });
      if (!appointment) throw new PaymentError('Rendez-vous introuvable.', 404);
      if (appointment.patient.userId !== userId) {
        throw new PaymentError('Ce rendez-vous ne vous appartient pas.', 403);
      }
      if (appointment.isPaid) throw new PaymentError('Ce rendez-vous est deja regle.', 409);

      amount = appointment.feeFcfa;
      cnamgsEligible = appointment.doctor.acceptsCnamgs;
      patientHasCnamgs = Boolean(appointment.patient.cnamgsNumber);
      description = `Consultation ${appointment.doctor.specialty} - ELAM`;
    } else if (relatedTo === 'RESERVATION') {
      const reservation = await prisma.medicationReservation.findUnique({
        where: { id: relatedId },
        include: { patient: true, pharmacy: true, medication: true },
      });
      if (!reservation) throw new PaymentError('Reservation introuvable.', 404);
      if (reservation.patient.userId !== userId) {
        throw new PaymentError('Cette reservation ne vous appartient pas.', 403);
      }
      if (reservation.status === 'COLLECTED') throw new PaymentError('Cette reservation est deja retiree.', 409);

      const stock = await prisma.pharmacyStock.findUnique({
        where: {
          pharmacyId_medicationId: {
            pharmacyId: reservation.pharmacyId,
            medicationId: reservation.medicationId,
          },
        },
      });
      if (!stock) {
        throw new PaymentError('Prix indisponible : cette officine n\'a pas declare ce medicament.', 409);
      }

      amount = stock.priceFcfa * reservation.quantity;
      cnamgsEligible = reservation.pharmacy.acceptsCnamgs;
      patientHasCnamgs = Boolean(reservation.patient.cnamgsNumber);
      description = `${reservation.quantity} x ${reservation.medication.name} - ELAM`;
    } else {
      // SUBSCRIPTION : relatedId porte le type de formule (ex: DOCTOR_PRO)
      const plan = SubscriptionService.getAvailablePlans().find((p) => p.planType === relatedId);
      if (!plan) throw new PaymentError('Formule d\'abonnement inconnue.', 404);
      if (!plan.priceFcfa) throw new PaymentError('Cette formule est gratuite : aucun paiement necessaire.');
      amount = plan.priceFcfa;
      cnamgsEligible = false; // la CNAMGS ne couvre pas les abonnements professionnels
      description = `Abonnement ${plan.name} - ELAM`;
    }

    // Couverture CNAMGS : calculee ici, jamais fournie par le client.
    const cnamgsCovered =
      cnamgsEligible && patientHasCnamgs ? Math.floor(amount * ENV.CNAMGS_COVERAGE_RATE) : 0;

    return {
      amount,
      cnamgsCovered,
      patientAmount: Math.max(0, amount - cnamgsCovered),
      currency: 'FCFA',
      description,
    };
  }

  // ======================================================================
  // 3. Verification d'etat (polling cote client)
  // ======================================================================
  static async refreshStatus(userId: string, transactionRef: string) {
    const payment = await prisma.payment.findUnique({ where: { transactionRef } });
    if (!payment) throw new PaymentError('Transaction introuvable.', 404);
    if (payment.userId && payment.userId !== userId) {
      throw new PaymentError('Cette transaction ne vous appartient pas.', 403);
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(payment.status)) {
      return this.serialize(payment);
    }

    const provider = getProviderFor(payment.operator as PaymentOperator);
    const result = await provider.getStatus(payment.transactionRef, payment.providerRef ?? undefined);

    if (result.status === 'COMPLETED') {
      return this.markCompleted(payment.transactionRef, result.providerRef, result.raw);
    }
    if (result.status === 'FAILED') {
      return this.markFailed(payment.transactionRef, result.errorMessage || 'Paiement refuse par l\'operateur.');
    }

    return this.serialize(payment);
  }

  // ======================================================================
  // 4. Webhook operateur : la seule source de verite pour confirmer
  // ======================================================================
  static async handleWebhook(
    providerName: 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'SANDBOX',
    headers: Record<string, unknown>,
    rawBody: string,
    payload: Record<string, unknown>
  ) {
    // Un webhook entrant est TOUJOURS verifie avec les regles de son propre
    // operateur, quel que soit le fournisseur actif pour les demandes sortantes.
    // Sinon, en mode SANDBOX, un webhook Airtel serait accepte sans signature.
    const provider =
      providerName === 'AIRTEL_MONEY'
        ? airtelProvider
        : providerName === 'MOOV_MONEY'
          ? moovProvider
          : sandboxProvider;

    if (!provider.verifyWebhook(headers, rawBody)) {
      throw new PaymentError('Signature de webhook invalide.', 401);
    }

    const parsed = provider.parseWebhook(payload);
    if (!parsed.transactionRef) {
      throw new PaymentError('Webhook sans reference de transaction.', 400);
    }

    const payment = await prisma.payment.findUnique({ where: { transactionRef: parsed.transactionRef } });
    if (!payment) throw new PaymentError('Transaction inconnue.', 404);

    // Idempotence : un webhook rejoue ne doit rien casser.
    if (payment.status === 'COMPLETED') {
      return this.serialize(payment);
    }

    if (parsed.status === 'COMPLETED') {
      return this.markCompleted(parsed.transactionRef, parsed.providerRef, payload);
    }
    if (parsed.status === 'FAILED') {
      return this.markFailed(parsed.transactionRef, parsed.reason || 'Paiement refuse par l\'operateur.', payload);
    }

    await prisma.payment.update({
      where: { transactionRef: parsed.transactionRef },
      data: {
        status: 'PROCESSING',
        providerRef: parsed.providerRef ?? payment.providerRef,
        rawCallback: JSON.stringify(payload),
      },
    });
    return this.serialize(await prisma.payment.findUniqueOrThrow({ where: { transactionRef: parsed.transactionRef } }));
  }

  // ======================================================================
  // 5. Transitions d'etat + effets metier
  // ======================================================================
  private static async markCompleted(transactionRef: string, providerRef?: string, raw?: unknown) {
    const payment = await prisma.payment.update({
      where: { transactionRef },
      data: {
        status: 'COMPLETED',
        confirmedAt: new Date(),
        providerRef: providerRef ?? undefined,
        rawCallback: raw ? JSON.stringify(raw) : undefined,
        failureReason: null,
      },
    });

    // Effets metier : c'est ICI que le rendez-vous devient paye et confirme.
    try {
      if (payment.relatedTo === 'APPOINTMENT') {
        await prisma.appointment.update({
          where: { id: payment.relatedId },
          data: { isPaid: true, status: 'CONFIRMED' },
        });
      } else if (payment.relatedTo === 'RESERVATION') {
        await prisma.medicationReservation.update({
          where: { id: payment.relatedId },
          data: { status: 'CONFIRMED' },
        });
      } else if (payment.relatedTo === 'SUBSCRIPTION' && payment.userId) {
        await SubscriptionService.subscribeToPlan(payment.userId, payment.relatedId as PlanType);
      }
    } catch (error) {
      // Le paiement est encaisse : on trace l'echec de l'effet metier sans le perdre.
      console.error('[PAYMENT] Paiement confirme mais effet metier en echec:', error);
    }

    return this.serialize(payment);
  }

  private static async markFailed(transactionRef: string, reason: string, raw?: unknown) {
    const payment = await prisma.payment.update({
      where: { transactionRef },
      data: {
        status: 'FAILED',
        failureReason: reason,
        rawCallback: raw ? JSON.stringify(raw) : undefined,
      },
    });
    return this.serialize(payment);
  }

  // ======================================================================
  // 6. Lecture
  // ======================================================================
  static async history(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return payments.map((p) => this.serialize(p));
  }

  static async getByReference(userId: string, transactionRef: string) {
    const payment = await prisma.payment.findUnique({ where: { transactionRef } });
    if (!payment) throw new PaymentError('Transaction introuvable.', 404);
    if (payment.userId && payment.userId !== userId) {
      throw new PaymentError('Cette transaction ne vous appartient pas.', 403);
    }
    return this.serialize(payment);
  }

  // ======================================================================
  // 7. Outils
  // ======================================================================
  /** Reference non devinable (l'ancien code utilisait Math.random). */
  private static generateReference(operator: PaymentOperator): string {
    const prefix = operator === 'AIRTEL_MONEY' ? 'AM' : operator === 'MOOV_MONEY' ? 'MM' : 'SBX';
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${prefix}-GA-${random}`;
  }

  private static serialize(payment: {
    id: string;
    transactionRef: string;
    status: string;
    amount: number;
    cnamgsCovered: number;
    patientAmount: number;
    currency: string;
    operator: string;
    phone: string;
    provider: string;
    providerRef: string | null;
    failureReason?: string | null;
  }) {
    return {
      id: payment.id,
      transactionRef: payment.transactionRef,
      status: payment.status,
      amount: payment.amount,
      cnamgsCovered: payment.cnamgsCovered,
      patientAmount: payment.patientAmount,
      currency: payment.currency,
      operator: payment.operator,
      phone: payment.phone,
      provider: payment.provider,
      providerRef: payment.providerRef,
      failureReason: payment.failureReason ?? null,
    };
  }

  /** Uniquement en bac a sable : simule la reponse de l'operateur. */
  static async simulateSandbox(transactionRef: string, status: PaymentStatus, reason?: string) {
    if (!ENV.PAYMENT_SANDBOX_ENABLED || ENV.NODE_ENV === 'production') {
      throw new PaymentError('Simulation desactivee.', 403);
    }
    const { sandboxProvider } = await import('./payments/index.js');
    const parsed = sandboxProvider.simulateCallback(transactionRef, status, reason);
    return this.handleWebhook('SANDBOX', {}, JSON.stringify(parsed), parsed as unknown as Record<string, unknown>);
  }
}
