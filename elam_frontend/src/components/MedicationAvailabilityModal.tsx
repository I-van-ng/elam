import React from 'react';
import { X, Pill, MapPin, Phone, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, ShoppingBag } from 'lucide-react';
import { MedicationSearchResult, MedicationAvailabilityOffer } from '../types';

interface MedicationAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: MedicationSearchResult | null;
  onReserve: (offer: MedicationAvailabilityOffer, medicationName: string) => void;
}

export const MedicationAvailabilityModal: React.FC<MedicationAvailabilityModalProps> = ({
  isOpen,
  onClose,
  result,
  onReserve,
}) => {
  if (!isOpen || !result) return null;

  const { medication, offers } = result;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/50 to-white rounded-t-3xl">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900">{medication.name}</h3>
                {medication.codeCnamgs && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> CNAMGS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                DCI : <strong className="text-slate-800">{medication.genericName}</strong> • Forme : {medication.form} ({medication.dosage})
              </p>
              <p className="text-xs text-slate-500 mt-1">{medication.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Offers List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pharmacies avec stock déclaré ({offers.length})
            </h4>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
              Données actualisées en direct
            </span>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Aucune officine n'a encore déclaré de stock pour ce médicament dans ce rayon.
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const isAvailable = offer.stockStatus === 'IN_STOCK';
                const isLow = offer.stockStatus === 'LOW_STOCK';

                return (
                  <div
                    key={offer.pharmacyId}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{offer.pharmacyName}</span>
                        {offer.isOnDuty && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                            🌙 Pharmacie de Garde
                          </span>
                        )}
                        {offer.acceptsCnamgs && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            CNAMGS ✓
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {offer.district || offer.address}
                          {offer.distanceKm !== undefined && (
                            <strong className="text-emerald-700 ml-1">({offer.distanceKm} km)</strong>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {offer.phone}
                        </span>
                      </div>

                      {/* Stock Status & Freshness Badge */}
                      <div className="flex items-center gap-2 pt-1">
                        {isAvailable && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 🟢 Disponible
                          </span>
                        )}
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> 🟠 Stock Faible ({offer.quantity} restants)
                          </span>
                        )}
                        {!isAvailable && !isLow && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> 🔴 Rupture
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {offer.freshness}
                        </span>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Prix public indicatif</p>
                        <p className="text-base font-extrabold text-slate-900">{offer.priceFcfa.toLocaleString()} FCFA</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${offer.phone.replace(/\s+/g, '')}`}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                        >
                          Appeler
                        </a>
                        <button
                          onClick={() => onReserve(offer, medication.name)}
                          disabled={!isAvailable && !isLow}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Réserver
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl text-center text-[11px] text-slate-500">
          💡 La disponibilité et les tarifs sont déclarés directement par les pharmaciens agréés d'officine.
        </div>
      </div>
    </div>
  );
};
