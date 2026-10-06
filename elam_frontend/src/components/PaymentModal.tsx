import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { api, PaymentRecord } from '../services/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  totalAmount: number;
  isCnamgsEligible?: boolean;
  relatedTo: 'APPOINTMENT' | 'RESERVATION' | 'SUBSCRIPTION';
  relatedId?: string;
  onSuccess?: (paymentInfo: any) => void;
}

type Step = 'FORM' | 'WAITING' | 'RECEIPT';
type Operator = 'AIRTEL_MONEY' | 'MOOV_MONEY';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_S = 120;

/**
 * Paiement Mobile Money (Airtel Money / Moov Money).
 *
 * Deux principes non negociables :
 *
 * 1. Le montant et la prise en charge CNAMGS sont calcules par le SERVEUR.
 *    Ce composant ne les envoie jamais : il les AFFICHE une fois recus.
 *
 * 2. On ne demande JAMAIS le code PIN Mobile Money. Le client valide la
 *    transaction chez son operateur (invite USSD ou application). Demander un
 *    PIN dans une application tierce, c'est exactement la forme d'une attaque
 *    par harponnage, et les operateurs l'interdisent.
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  totalAmount,
  isCnamgsEligible = true,
  relatedTo,
  relatedId,
  onSuccess,
}) => {
  const [phone, setPhone] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<Operator>('AIRTEL_MONEY');
  const [step, setStep] = useState<Step>('FORM');
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [secondsWaiting, setSecondsWaiting] = useState(0);

  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // On nettoie toujours les minuteurs : pas de requete fantome apres fermeture.
  useEffect(() => stopPolling, [stopPolling]);

  // Remise a zero a chaque ouverture / changement de cible.
  useEffect(() => {
    if (isOpen) {
      stopPolling();
      setStep('FORM');
      setPayment(null);
      setInstructions('');
      setErrorMessage(null);
      setFailureReason(null);
      setSecondsWaiting(0);
    }
  }, [isOpen, relatedId, stopPolling]);

  const detectOperatorFromPhone = (val: string): Operator | null => {
    const cleaned = val.replace(/\D/g, '');
    let local = cleaned;
    if (local.startsWith('241')) local = local.slice(3);
    if (local.startsWith('0')) local = local.slice(1);

    if (['74', '76', '77', '11'].some((p) => local.startsWith(p))) return 'AIRTEL_MONEY';
    if (['62', '65', '66'].some((p) => local.startsWith(p))) return 'MOOV_MONEY';
    return null;
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const detected = detectOperatorFromPhone(val);
    if (detected) setSelectedOperator(detected);
  };

  const isAirtel = selectedOperator === 'AIRTEL_MONEY';
  const ussdCode = isAirtel ? '*150#' : '*555#';
  const operatorLabel = isAirtel ? 'Airtel Money' : 'Moov Money';

  /** Suit le paiement aupres de l'operateur jusqu'a confirmation ou echec. */
  const startPolling = useCallback(
    (transactionRef: string) => {
      stopPolling();
      setSecondsWaiting(0);
      tickRef.current = window.setInterval(() => setSecondsWaiting((s) => s + 1), 1000);

      pollRef.current = window.setInterval(async () => {
        try {
          const current = await api.getPaymentStatus(transactionRef);
          setPayment(current);

          if (current.status === 'COMPLETED') {
            stopPolling();
            setStep('RECEIPT');
            if (onSuccess) {
              onSuccess({
                txnRef: current.transactionRef,
                amount: current.patientAmount,
                operator: current.operator,
              });
            }
          } else if (current.status === 'FAILED' || current.status === 'CANCELLED') {
            stopPolling();
            setFailureReason(current.failureReason || 'Transaction refusee ou annulee.');
          }
        } catch {
          // Erreur reseau passagere : on retente au prochain cycle.
        }
      }, POLL_INTERVAL_MS);
    },
    [onSuccess, stopPolling]
  );

  // Arret du suivi au bout du delai : on l'annonce au lieu de tourner sans fin.
  useEffect(() => {
    if (step === 'WAITING' && secondsWaiting >= POLL_TIMEOUT_S) {
      stopPolling();
    }
  }, [step, secondsWaiting, stopPolling]);

  const checkNow = async () => {
    if (!payment) return;
    setLoading(true);
    try {
      const current = await api.getPaymentStatus(payment.transactionRef);
      setPayment(current);
      if (current.status === 'COMPLETED') {
        stopPolling();
        setStep('RECEIPT');
        if (onSuccess) {
          onSuccess({
            txnRef: current.transactionRef,
            amount: current.patientAmount,
            operator: current.operator,
          });
        }
      } else if (current.status === 'FAILED' || current.status === 'CANCELLED') {
        stopPolling();
        setFailureReason(current.failureReason || 'Transaction refusee ou annulee.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!relatedId) {
      setErrorMessage("Cette opération ne possède pas encore de référence à régler.");
      return;
    }
    const detected = detectOperatorFromPhone(phone);
    if (!detected) {
      setErrorMessage('Entrez un numéro Airtel Money (074, 076, 077, 011) ou Moov Money (062, 065, 066).');
      return;
    }
    if (detected !== selectedOperator) {
      setSelectedOperator(detected);
      setErrorMessage(`Ce numéro correspond à ${detected === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Moov Money'}.`);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await api.initiatePayment({
        relatedTo,
        relatedId,
        phone,
        operator: selectedOperator,
      });
      setPayment(result.payment);
      setInstructions(result.instructions || '');
      setStep('WAITING');
      startPolling(result.payment.transactionRef);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "La demande de paiement n'a pas pu être envoyée."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Paiement Mobile Money 🇬🇦</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---------------- Etape 1 : formulaire ---------------- */}
        {step === 'FORM' && (
          <div className="p-6 space-y-5">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                {errorMessage}
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Service médical
                </p>
                <p className="font-bold text-emerald-950 text-sm mt-0.5">{serviceTitle}</p>
              </div>
              <span className="bg-white px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 shadow-sm border border-emerald-100">
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            {isCnamgsEligible && (
              <div className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Prise en charge CNAMGS</p>
                  <p className="text-xs text-slate-500">
                    Appliquée automatiquement par nos services si vous êtes bénéficiaire : le
                    montant exact à débiter vous sera confirmé avant validation.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Opérateur Gabonais
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOperator('AIRTEL_MONEY')}
                  className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    isAirtel
                      ? 'border-red-600 bg-red-50/40 text-red-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-red-600">Airtel Money</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                      *150#
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-2">074 / 076 / 077</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOperator('MOOV_MONEY')}
                  className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    !isAirtel
                      ? 'border-blue-700 bg-blue-50/40 text-blue-950 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-blue-700">Moov Money</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      *555#
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-2">062 / 065 / 066</span>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="payment-phone"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Numéro de Téléphone
              </label>
              <input
                id="payment-phone"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+241 07 XX XX XX"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-800"
              />
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-60 ${
                isAirtel ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi de la demande...</span>
                </>
              ) : (
                <>
                  <span>Payer avec {operatorLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ---------------- Etape 2 : attente de validation ---------------- */}
        {step === 'WAITING' && payment && (
          <div className="p-6 space-y-5">
            {failureReason ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start space-x-3"
              >
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Paiement non abouti</p>
                  <p className="text-xs text-rose-700 mt-0.5">{failureReason}</p>
                </div>
              </div>
            ) : secondsWaiting >= POLL_TIMEOUT_S ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Toujours en attente</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    La validation n'est pas encore parvenue. Vérifiez sur votre téléphone, puis
                    relancez la vérification.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900">
                    Validez sur votre téléphone
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Une demande a été envoyée au <strong>{payment.phone}</strong>. Saisissez votre
                    code secret chez {operatorLabel}, jamais ici.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 font-mono text-xs shadow-inner">
              <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
                <span>{failureReason ? 'TRANSACTION' : 'EN ATTENTE DE VALIDATION'}</span>
                <span className="text-emerald-400">{ussdCode}</span>
              </div>
              <p className="font-sans text-sm text-slate-200">
                Marchand : <strong className="text-white">ELAM SANTE GABON</strong>
              </p>
              <p className="font-sans text-sm text-slate-200">
                Montant à débiter :{' '}
                <strong className="text-emerald-400 text-base">
                  {payment.patientAmount.toLocaleString('fr-FR')} FCFA
                </strong>
              </p>
              {instructions && <p className="text-slate-400 text-xs">{instructions}</p>}
            </div>

            {/* Detail calcule par le serveur */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Montant du service :</span>
                <span>{payment.amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {payment.cnamgsCovered > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Part CNAMGS :</span>
                  <span>- {payment.cnamgsCovered.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-base text-slate-900">
                <span>Net à débiter :</span>
                <span className={isAirtel ? 'text-red-600' : 'text-blue-700'}>
                  {payment.patientAmount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Réf. {payment.transactionRef}</span>
              {!failureReason && secondsWaiting < POLL_TIMEOUT_S && (
                <span className="inline-flex items-center space-x-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>En attente depuis {secondsWaiting} s</span>
                </span>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  stopPolling();
                  setStep('FORM');
                  setFailureReason(null);
                }}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition"
              >
                {failureReason ? 'Réessayer' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={checkNow}
                disabled={loading}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-md transition inline-flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Vérifier maintenant</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------- Etape 3 : recu ---------------- */}
        {step === 'RECEIPT' && payment && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-extrabold text-xl text-slate-900">Paiement Confirmé !</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Transaction validée par {operatorLabel}.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Réf. Transaction :</span>
                <span className="font-bold text-slate-900">{payment.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Opérateur :</span>
                <span className="font-bold text-slate-900">{operatorLabel} Gabon</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service :</span>
                <span className="font-bold text-slate-900">{serviceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Montant du service :</span>
                <span className="font-bold text-slate-900">
                  {payment.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              {payment.cnamgsCovered > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Part CNAMGS :</span>
                  <span className="font-bold">
                    - {payment.cnamgsCovered.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
                <span>Montant Réglé :</span>
                <span className="text-emerald-700">
                  {payment.patientAmount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              Fermer et Accéder à mon espace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
