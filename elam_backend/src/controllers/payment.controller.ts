import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export function detectOperator(phone: string): 'AIRTEL_MONEY' | 'MOOV_MONEY' {
  const cleaned = (phone || '').replace(/\D/g, '');
  let local = cleaned;
  if (local.startsWith('241')) local = local.slice(3);
  if (local.startsWith('0')) local = local.slice(1);

  if (['74', '76', '77', '11'].some(prefix => local.startsWith(prefix))) {
    return 'AIRTEL_MONEY';
  } else if (['62', '65', '66'].some(prefix => local.startsWith(prefix))) {
    return 'MOOV_MONEY';
  }
  return 'AIRTEL_MONEY';
}

export async function initiatePayment(req: Request, res: Response) {
  try {
    const { amount, phone, operator, relatedTo, relatedId, applyCnamgs } = req.body;

    if (!amount || !phone || !relatedTo || !relatedId) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants (amount, phone, relatedTo, relatedId).' });
    }

    const op = operator || detectOperator(phone);
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
