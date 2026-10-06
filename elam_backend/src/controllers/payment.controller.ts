import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

type MobileMoneyOperator = 'AIRTEL_MONEY' | 'MOOV_MONEY';

function normalizeGabonPhone(phone: string) {
  const cleaned = (phone || '').replace(/\D/g, '');
  let local = cleaned;
  if (local.startsWith('241')) local = local.slice(3);
  if (local.startsWith('0')) local = local.slice(1);

  return local;
}

export function detectOperator(phone: string): MobileMoneyOperator | null {
  const local = normalizeGabonPhone(phone);

  if (['74', '76', '77', '11'].some(prefix => local.startsWith(prefix))) {
    return 'AIRTEL_MONEY';
  } else if (['62', '65', '66'].some(prefix => local.startsWith(prefix))) {
    return 'MOOV_MONEY';
  }
  return null;
}

export async function initiatePayment(req: Request, res: Response) {
  try {
    const { amount, phone, operator, relatedTo, relatedId, applyCnamgs } = req.body;

    if (!amount || !phone || !relatedTo || !relatedId) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants (amount, phone, relatedTo, relatedId).' });
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant du paiement est invalide.' });
    }

    if (!['APPOINTMENT', 'RESERVATION', 'SUBSCRIPTION'].includes(relatedTo)) {
      return res.status(400).json({ success: false, message: 'Type de paiement non pris en charge.' });
    }

    const detectedOperator = detectOperator(phone);
    if (!detectedOperator) {
      return res.status(400).json({
        success: false,
        message: 'Numéro mobile money gabonais invalide. Airtel: 074/076/077/011, Moov: 062/065/066.',
      });
    }

    const op = (operator || detectedOperator) as MobileMoneyOperator;
    if (!['AIRTEL_MONEY', 'MOOV_MONEY'].includes(op)) {
      return res.status(400).json({ success: false, message: 'Opérateur mobile money non pris en charge.' });
    }

    if (operator && operator !== detectedOperator) {
      return res.status(400).json({
        success: false,
        message: `Le numéro renseigné correspond à ${detectedOperator === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Moov Money'}.`,
      });
    }

    const cnamgsCovered = applyCnamgs ? Math.floor(amount * 0.8) : 0;
    const netAmount = amount - cnamgsCovered;

    const prefix = op === 'AIRTEL_MONEY' ? 'AM-GA' : 'MM-GA';
    const txnRef = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        amount: netAmount,
        currency: 'FCFA',
        operator: op,
        phone,
        transactionRef: txnRef,
        status: 'COMPLETED',
        relatedTo,
        relatedId,
        cnamgsCovered,
      },
    });

    // If related to appointment, update status
    if (relatedTo === 'APPOINTMENT') {
      await prisma.appointment.update({
        where: { id: relatedId },
        data: { isPaid: true, status: 'CONFIRMED' },
      }).catch(() => null);
    }

    // If related to reservation, update status
    if (relatedTo === 'RESERVATION') {
      await prisma.medicationReservation.update({
        where: { id: relatedId },
        data: { status: 'CONFIRMED' },
      }).catch(() => null);
    }

    return res.status(201).json({
      success: true,
      message: `Paiement validé avec succès via ${op === 'AIRTEL_MONEY' ? 'Airtel Money (*150#)' : 'Moov Money (*555#)'}`,
      data: {
        payment,
        receipt: {
          transactionRef: txnRef,
          operator: op,
          totalAmount: amount,
          cnamgsCovered,
          netPaid: netAmount,
          phone,
          timestamp: payment.createdAt,
          status: 'PAID',
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Erreur lors du traitement du paiement.' });
  }
}

export async function verifyPayment(req: Request, res: Response) {
  try {
    const { transactionRef } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { transactionRef },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Transaction introuvable.' });
    }

    return res.json({ success: true, data: payment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getPaymentHistory(req: Request, res: Response) {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: payments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
