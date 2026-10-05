import React, { useState, useEffect } from 'react';
import {
  Pill,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PharmacyProfile, MedicationSearchResult, MedicationAvailabilityOffer } from '../types';
import { MedicationAvailabilityModal } from '../components/MedicationAvailabilityModal';
import { ReservationModal } from '../components/ReservationModal';
import { realPharmacies } from '../data/realDirectory';
import { buildGoogleMapsUrl, buildOsmUrl, formatCoordinates } from '../utils/locationLinks';

export const PharmaciesPage: React.FC = () => {
  const { userLocation } = useAuth();
  const [pharmacies, setPharmacies] = useState<PharmacyProfile[]>([]);
  const [search, setSearch] = useState('');
  const [onlyDuty, setOnlyDuty] = useState(false);
  const [onlyCnamgs, setOnlyCnamgs] = useState(false);

  // Medication search
  const [medQuery, setMedQuery] = useState('');
  const [selectedMedResult, setSelectedMedResult] = useState<MedicationSearchResult | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);

  const [selectedOfferForReserve, setSelectedOfferForReserve] = useState<{
    offer: MedicationAvailabilityOffer;
    medicationName: string;
    medicationId: string;
  } | null>(null);

  const normalizeName = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const filterLocalPharmacies = (items: PharmacyProfile[]) =>
    items.filter((pharm) => {
      const searchText = `${pharm.name} ${pharm.address} ${pharm.district} ${pharm.phone}`.toLowerCase();
      return (
        (!onlyDuty || pharm.isOnDuty) &&
        (!onlyCnamgs || pharm.acceptsCnamgs) &&
        (!search || searchText.includes(search.toLowerCase()))
      );
    });

  const mergeWithLocalDirectory = (apiPharmacies: PharmacyProfile[]) => {
    const merged = [...filterLocalPharmacies(realPharmacies)];
    const knownNames = new Set(merged.map((pharm) => normalizeName(pharm.name)));

    apiPharmacies.forEach((pharm) => {
      const normalizedName = normalizeName(pharm.name);
      if (!knownNames.has(normalizedName)) {
        merged.push(pharm);
        knownNames.add(normalizedName);
      }
    });

    return merged;
  };

  const loadPharmacies = async () => {
    try {
      const data = await api.listPharmacies({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm: 30,
        isOnDuty: onlyDuty ? true : undefined,
        acceptsCnamgs: onlyCnamgs ? true : undefined,
        search: search || undefined,
      });
      setPharmacies(mergeWithLocalDirectory(data || []));
    } catch (err) {
      console.warn('Fallback pharmacies list:', err);
      setPharmacies(filterLocalPharmacies(realPharmacies));
    }
  };

  useEffect(() => {
    loadPharmacies();
  }, [onlyDuty, onlyCnamgs, search]);

  const handleMedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medQuery) return;
    try {
      const results = await api.searchMedicationAvailability(medQuery, userLocation.lat, userLocation.lng);
      if (results && results.length > 0) {
        setSelectedMedResult(results[0]);
        setIsMedModalOpen(true);
      } else {
        alert(`Aucun stock déclaré pour "${medQuery}" pour le moment.`);
      }
    } catch (err) {
      alert(`Recherche de "${medQuery}" indisponible.`);
    }
  };

  return (
    <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Pharmacies de garde
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Officines et numéros de garde à Libreville, Akanda, Owendo et PK
        </p>
      </div>

      {/* Medication Search Input */}
      <form onSubmit={handleMedSearch} className="relative">
        <div className="flex items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition">
          <div className="pl-3 text-emerald-600">
            <Pill className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Tapez un médicament (ex: Amoxicilline, Doliprane...)"
            value={medQuery}
            onChange={(e) => setMedQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          <button
            type="submit"
            className="tap-active bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            Vérifier Stock
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button
          onClick={() => {
            setOnlyDuty(false);
            setOnlyCnamgs(false);
          }}
          className={`tap-active px-3.5 py-2 rounded-full font-bold transition whitespace-nowrap ${
            !onlyDuty && !onlyCnamgs ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          Toutes ({pharmacies.length})
        </button>
        <button
          onClick={() => setOnlyDuty(!onlyDuty)}
          className={`tap-active px-3.5 py-2 rounded-full font-bold transition whitespace-nowrap flex items-center gap-1 ${
            onlyDuty ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          🌙 De Garde (24h/24)
        </button>
        <button
          onClick={() => setOnlyCnamgs(!onlyCnamgs)}
          className={`tap-active px-3.5 py-2 rounded-full font-bold transition whitespace-nowrap flex items-center gap-1 ${
            onlyCnamgs ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> CNAMGS
        </button>
      </div>

      {/* Pharmacies List */}
      <div className="space-y-3">
        {pharmacies.map((pharm) => (
          <div
            key={pharm.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                💊
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm text-slate-900">{pharm.name}</h3>
                  {pharm.isOnDuty && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                      🌙 En Garde
                    </span>
                  )}
                  {pharm.acceptsCnamgs && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      CNAMGS ✓
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    pharm.positionConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {pharm.positionConfirmed ? 'Position confirmée' : 'Position à vérifier'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {pharm.address}
                  {pharm.distanceKm !== undefined && (
                    <strong className="text-emerald-700 ml-1">({pharm.distanceKm} km)</strong>
                  )}
                </p>

                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Horaires : {pharm.openingHours}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="text-slate-400">{formatCoordinates(pharm.latitude, pharm.longitude)}</span>
                  <a
                    href={buildOsmUrl(pharm.latitude, pharm.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
                  >
                    OSM <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={buildGoogleMapsUrl(pharm.latitude, pharm.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800"
                  >
                    Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <a
                href={`tel:${pharm.phone.split('/')[0].replace(/\s+/g, '')}`}
                className="tap-active flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold text-center transition flex items-center justify-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Appeler ({pharm.phone})
              </a>
              <button
                onClick={() => {
                  setMedQuery('Amoxicilline');
                  handleMedSearch({ preventDefault: () => {} } as any);
                }}
                className="tap-active flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition shadow-sm"
              >
                Vérifier stocks
              </button>
            </div>
          </div>
        ))}
      </div>

      <MedicationAvailabilityModal
        isOpen={isMedModalOpen}
        onClose={() => setIsMedModalOpen(false)}
        result={selectedMedResult}
        onReserve={(offer, medName) => {
          if (selectedMedResult) {
            setSelectedOfferForReserve({ offer, medicationName: medName, medicationId: selectedMedResult.medication.id });
          }
        }}
      />

      <ReservationModal
        isOpen={!!selectedOfferForReserve}
        onClose={() => setSelectedOfferForReserve(null)}
        offer={selectedOfferForReserve?.offer || null}
        medicationName={selectedOfferForReserve?.medicationName || ''}
        medicationId={selectedOfferForReserve?.medicationId}
      />
    </div>
  );
};
