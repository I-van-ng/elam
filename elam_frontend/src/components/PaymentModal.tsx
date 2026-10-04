import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Smartphone, Receipt, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

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
  const [phone, setPhone] = useState('+241 07 69 50 40');
  const [selectedOperator, setSelectedOperator] = useState<'AIRTEL_MONEY' | 'MOOV_MONEY'>('AIRTEL_MONEY');
  const [applyCnamgs, setApplyCnamgs] = useState(isCnamgsEligible);
  const [step, setStep] = useState<'FORM' | 'USSD_PUSH' | 'RECEIPT'>('FORM');
  const [pin, setPin] = useState('1234');
  const [txnRef, setTxnRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const cnamgsCoverage = applyCnamgs && isCnamgsEligible ? Math.floor(totalAmount * 0.8) : 0;
  const netAmount = totalAmount - cnamgsCoverage;

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const cleaned = val.replace(/\D/g, '');
    let local = cleaned;
    if (local.startsWith('241')) local = local.slice(3);
    if (local.startsWith('0')) local = local.slice(1);

    if (['74', '76', '77', '11'].some((p) => local.startsWith(p))) {
      setSelectedOperator('AIRTEL_MONEY');
    } else if (['62', '65', '66'].some((p) => local.startsWith(p))) {
      setSelectedOperator('MOOV_MONEY');
    }
  };

  const handleTriggerUssd = () => {
    if (!relatedId) {
      setErrorMessage('Cette opération ne possède pas encore de référence à régler.');
      return;
    }
    setErrorMessage(null);
    setStep('USSD_PUSH');
  };

  const handleConfirmUssd = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await api.initiatePayment({
        amount: totalAmount,
        phone,
        operator: selectedOperator,
        relatedTo,
        relatedId: relatedId!,
        applyCnamgs,
      });
      const ref = result.receipt?.transactionRef || result.payment?.transactionRef;
      if (!ref) throw new Error('La réponse de paiement est invalide.');
      setTxnRef(ref);
      setLoading(false);
      setStep('RECEIPT');
      if (onSuccess) {
        onSuccess({ txnRef: ref, amount: netAmount, operator: selectedOperator });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Le paiement n'a pas pu être valide.");
      setLoading(false);
    }
  };

  const isAirtel = selectedOperator === 'AIRTEL_MONEY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Paiement Mobile Money 🇬🇦</h3>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Step 1 : Form */}
        {step === 'FORM' && (
          <div className="p-6 space-y-5">
            {errorMessage && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
            {/* Service Summary */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Service médical</p>
                <p className="font-bold text-emerald-950 text-sm mt-0.5">{serviceTitle}</p>
              </div>
              <span className="bg-white px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 shadow-sm border border-emerald-100">
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            {/* CNAMGS Switch */}
            {isCnamgsEligible && (
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/60 transition">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Bénéficiaire CNAMGS (80%)</p>
                    <p className="text-xs text-slate-500">Prise en charge automatique de l'assurance</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={applyCnamgs}
                  onChange={(e) => setApplyCnamgs(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </label>
            )}

            {/* Operator Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Opérateur Gabonais
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOperator('AIRTEL_MONEY')}
                  className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    isAirtel ? 'border-red-600 bg-red-50/40 text-red-900 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-red-600">Airtel Money</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">*150#</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-2">074 / 076 / 077</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOperator('MOOV_MONEY')}
                  className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    !isAirtel ? 'border-blue-700 bg-blue-50/40 text-blue-950 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-blue-700">Moov Money</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">*555#</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-2">062 / 065 / 066</span>
                </button>
              </div>
            </div>

            {/* Phone input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Numéro de Téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+241 07 XX XX XX"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-800"
              />
            </div>

            {/* Amount Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Montant initial :</span>
                <span>{totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {applyCnamgs && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Part CNAMGS (80%) :</span>
                  <span>- {cnamgsCoverage.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-base text-slate-900">
                <span>Net à débiter :</span>
                <span className={isAirtel ? 'text-red-600' : 'text-blue-700'}>
                  {netAmount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={handleTriggerUssd}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 ${
                isAirtel ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              <span>Continuer avec {isAirtel ? 'Airtel Money' : 'Moov Money'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Step 2 : USSD Prompt simulation */}
        {step === 'USSD_PUSH' && (
          <div className="p-6 space-y-5">
            {errorMessage && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 font-mono text-xs shadow-inner">
              <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
                <span>PUSH USSD GABON</span>
                <span className="text-emerald-400">{isAirtel ? '*150#' : '*555#'}</span>
              </div>
              <p className="font-sans text-sm text-slate-200">
                Marchand : <strong className="text-white">ELAM SANTE GABON</strong>
              </p>
              <p className="font-sans text-sm text-slate-200">
                Montant : <strong className="text-emerald-400 text-base">{netAmount.toLocaleString('fr-FR')} FCFA</strong>
              </p>
              <p className="text-slate-400 text-xs">Autoriser le prélèvement depuis votre compte {isAirtel ? 'Airtel' : 'Moov'} ?</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Entrez votre code secret PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center tracking-widest text-2xl font-bold py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmUssd}
                className={`w-1/2 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition ${
                  isAirtel ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {loading ? 'Validation...' : 'Valider le paiement'}
              </button>
            </div>
          </div>
        )}

        {/* Content Step 3 : Receipt */}
        {step === 'RECEIPT' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-extrabold text-xl text-slate-900">Paiement Confirmé !</h4>
              <p className="text-xs text-slate-500 mt-0.5">Votre transaction a été validée avec succès.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Réf. Transaction :</span>
                <span className="font-bold text-slate-900">{txnRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Opérateur :</span>
                <span className="font-bold text-slate-900">{isAirtel ? 'Airtel Money Gabon' : 'Moov Money Flooz'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service :</span>
                <span className="font-bold text-slate-900">{serviceTitle}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
                <span>Montant Réglé :</span>
                <span className="text-emerald-700">{netAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              Fermer & Accéder à mon espace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
