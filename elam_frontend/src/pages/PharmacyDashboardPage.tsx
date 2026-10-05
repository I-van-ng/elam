import React, { useState, useEffect } from 'react';
import {
  Pill,
  Moon,
  Sun,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShoppingBag,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MedicationReservation } from '../types';

export const PharmacyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [reservations, setReservations] = useState<MedicationReservation[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock stock management
  const [stocks, setStocks] = useState([
    { id: '1', name: 'Amoxicilline 500mg', status: 'IN_STOCK', quantity: 45, priceFcfa: 3500 },
    { id: '2', name: 'Doliprane 1000mg', status: 'IN_STOCK', quantity: 120, priceFcfa: 1800 },
    { id: '3', name: 'Coartem 80/480mg', status: 'IN_STOCK', quantity: 28, priceFcfa: 4200 },
    { id: '4', name: 'Ventoline 100µg', status: 'LOW_STOCK', quantity: 3, priceFcfa: 4900 },
  ]);

  const loadPharmacyData = async () => {
    setLoading(true);
    try {
      const data = await api.getPharmacyReservations();
      setReservations(data || []);
    } catch (err) {
      console.warn('Fallback reservations:', err);
      setReservations([
        {
          id: 'res-1',
          patientId: 'pat-1',
          pharmacyId: 'pharm-1',
          medicationId: 'med-1',
          quantity: 2,
          status: 'PENDING',
          notes: 'Je passerai ce soir vers 18h30 après le travail.',
          medication: {
            id: 'med-1',
            name: 'Amoxicilline 500mg',
            genericName: 'Amoxicilline',
            category: 'Antibiotique',
            form: 'Gélule',
            dosage: '500mg',
            requiresPrescription: true,
          },
          patient: {
            user: {
              firstName: 'Hans',
              lastName: 'Mba Ndong',
              phone: '+241 07 69 50 40',
            },
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacyData();
  }, []);

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
      await api.updateDutyStatus(newStatus);
    } catch {
      setIsOnDuty(!newStatus);
    }
  };

  const handleUpdateStockStatus = async (medId: string, status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK') => {
    const previousStatus = stocks.find((stock) => stock.id === medId)?.status;
    setStocks((prev) =>
      prev.map((s) => (s.id === medId ? { ...s, status } : s))
    );
    try {
      await api.updateStock(medId, status);
    } catch {
      if (previousStatus) {
        setStocks((prev) => prev.map((stock) => (stock.id === medId ? { ...stock, status: previousStatus } : stock)));
      }
    }
  };

  const handleUpdateReservationStatus = async (resId: string, status: 'READY' | 'COLLECTED' | 'CANCELLED') => {
    const previousStatus = reservations.find((reservation) => reservation.id === resId)?.status;
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status } : r))
    );
    try {
      await api.updateReservationStatus(resId, status);
    } catch {
      if (previousStatus) {
        setReservations((prev) => prev.map((reservation) => (
          reservation.id === resId ? { ...reservation, status: previousStatus } : reservation
        )));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Pharmacy Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-lg">
              💊
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Portail Officine : Pharmacie Saint Antoine
              </h1>
              <p className="text-emerald-200 text-xs font-semibold">
                Barracuda, Libreville • Tél : +241 74 33 57 77
              </p>
            </div>
          </div>

          {/* Quick On-Duty Switch */}
          <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700/80 p-3 rounded-2xl">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Statut Officine</span>
              <strong className={`text-xs font-bold ${isOnDuty ? 'text-amber-400' : 'text-slate-300'}`}>
                {isOnDuty ? '🌙 Pharmacie de Garde (Active)' : '☀️ Horaires Normaux'}
              </strong>
            </div>

            <button
              onClick={handleToggleDuty}
              className={`p-2.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs shadow-md ${
                isOnDuty ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isOnDuty ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {isOnDuty ? 'Désactiver Garde' : 'Activer Garde'}
            </button>
          </div>
        </div>

        {/* Section 1: Stock Live Management */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Gestion des Stocks de Médicaments (Mise à jour en 1 clic)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Les modifications apparaissent instantanément sur la recherche des patients.
              </p>
            </div>

            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Synchronisé avec le moteur Waze Santé
            </span>
          </div>

          <div className="space-y-3">
            {stocks.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-500 font-semibold">({item.priceFcfa.toLocaleString()} FCFA)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Quantité en réserve : <strong>{item.quantity} boîtes</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStockStatus(item.id, 'IN_STOCK')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      item.status === 'IN_STOCK'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 Disponible
                  </button>

                  <button
                    onClick={() => handleUpdateStockStatus(item.id, 'LOW_STOCK')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      item.status === 'LOW_STOCK'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> 🟠 Stock Faible
                  </button>

                  <button
                    onClick={() => handleUpdateStockStatus(item.id, 'OUT_OF_STOCK')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      item.status === 'OUT_OF_STOCK'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> 🔴 Rupture
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Reservations Received */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Réservations et Demandes d'Ordonnances Reçues
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Préparez les boîtes pour les patients avant leur passage au comptoir.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              {reservations.length} demande(s)
            </span>
          </div>

          <div className="space-y-3">
            {reservations.map((res) => (
              <div
                key={res.id}
                className="p-4 rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900">{res.medication.name}</h4>
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
                      Quantité : {res.quantity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Patient : <strong>{res.patient?.user.firstName} {res.patient?.user.lastName}</strong> (Tél : {res.patient?.user.phone})
                  </p>
                  {res.notes && (
                    <p className="text-xs text-slate-500 italic">« {res.notes} »</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {res.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateReservationStatus(res.id, 'READY')}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      📦 Marquer Prête au comptoir
                    </button>
                  )}

                  {res.status === 'READY' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl">
                        Prête au comptoir
                      </span>
                      <button
                        onClick={() => handleUpdateReservationStatus(res.id, 'COLLECTED')}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                      >
                        ✓ Retirée
                      </button>
                    </div>
                  )}

                  {res.status === 'COLLECTED' && (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                      Commande Retirée
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
