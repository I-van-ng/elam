import React, { useState } from 'react';
import { X, ShoppingBag, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { MedicationAvailabilityOffer } from '../types';
import { api } from '../services/api';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: MedicationAvailabilityOffer | null;
  medicationName: string;
  medicationId?: string;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  offer,
  medicationName,
  medicationId,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !offer) return null;

  const totalPrice = offer.priceFcfa * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationId) {
      setErrorMessage('Identifiant du médicament indisponible.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      await api.createReservation({
        pharmacyId: offer.pharmacyId,
        medicationId,
        quantity,
        notes,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Impossible de transmettre la réservation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-purple-50/50 to-white">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20 font-bold">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Mettre de côté / Réserver</h3>
              <p className="text-xs text-purple-700 font-semibold">{offer.pharmacyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Demande Transmise !</h4>
            <p className="text-xs text-slate-600">
              L'officine <strong>{offer.pharmacyName}</strong> a été notifiée et prépare votre commande. Vous recevrez une alerte dès qu'elle sera prête au comptoir.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-900">{medicationName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Prix unitaire : {offer.priceFcfa.toLocaleString()} FCFA</p>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quantité souhaitée (boîtes)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 text-base flex items-center justify-center transition"
                >
                  -
                </button>
                <span className="font-extrabold text-base text-slate-900 w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 text-base flex items-center justify-center transition"
                >
                  +
                </button>
                <div className="ml-auto text-right">
                  <span className="text-[10px] text-slate-400">Total estimé :</span>
                  <p className="font-extrabold text-sm text-slate-900">{totalPrice.toLocaleString()} FCFA</p>
                </div>
              </div>
            </div>

            {/* Notes / Ordonnance */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Instructions ou n° ordonnance
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Je passerai récupérer vers 18h en sortant du travail..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-amber-50 border border-amber-200/50 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pour les médicaments sous ordonnance, présentez votre document officiel au moment du retrait.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2"
            >
              {loading ? 'Envoi...' : `Confirmer la réservation (${totalPrice.toLocaleString()} FCFA)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
