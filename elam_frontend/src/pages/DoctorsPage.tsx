import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  MapPin,
  Star,
  ShieldCheck,
  Video,
  Home,
  Search,
  CalendarCheck,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DoctorProfile } from '../types';
import { DoctorBookingModal } from '../components/DoctorBookingModal';

export const DoctorsPage: React.FC = () => {
  const { userLocation } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [onlyTeleconsult, setOnlyTeleconsult] = useState(false);
  const [onlyCnamgs, setOnlyCnamgs] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Booking modal
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const specialties = [
    'ALL',
    'Cardiologie',
    'Pédiatrie',
    'Médecine Générale',
    'Gynécologie',
    'Dermatologie',
    'Ophtalmologie',
  ];

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const data = await api.listDoctors({
        lat: userLocation.lat,
        lng: userLocation.lng,
        specialty: selectedSpecialty !== 'ALL' ? selectedSpecialty : undefined,
        acceptsTeleconsult: onlyTeleconsult ? true : undefined,
        acceptsCnamgs: onlyCnamgs ? true : undefined,
        search: search || undefined,
      });
      setDoctors(data || []);
    } catch (err) {
      console.warn('Fallback doctors list:', err);
      setDoctors([
        {
          id: 'doc-1',
          userId: 'u-d-1',
          title: 'Dr.',
          specialty: 'Cardiologie',
          subSpecialties: 'Échocardiographie, Hypertension artérielle',
          bio: 'Spécialiste des pathologies cardiovasculaires avec 14 ans d\'expérience au Gabon.',
          consultationFee: 25000,
          acceptsCnamgs: true,
          acceptsTeleconsult: true,
          acceptsHomeVisit: false,
          address: 'Cabinet Médical du Littoral, Glass',
          city: 'Libreville',
          district: 'Glass',
          latitude: 0.3801,
          longitude: 9.4472,
          rating: 4.9,
          reviewCount: 42,
          verificationStatus: 'VERIFIED',
          distanceKm: 5.1,
          user: { firstName: 'Alain', lastName: 'Minko' },
        },
        {
          id: 'doc-2',
          userId: 'u-d-2',
          title: 'Dr.',
          specialty: 'Pédiatrie',
          subSpecialties: 'Néonatologie, Suivi du nourrisson, Vaccinations',
          bio: 'Pédiatre passionnée par la santé infantile et le développement de l\'enfant.',
          consultationFee: 20000,
          acceptsCnamgs: true,
          acceptsTeleconsult: true,
          acceptsHomeVisit: true,
          address: "Centre Médical d'Angondjé, Akanda",
          city: 'Libreville',
          district: 'Akanda',
          latitude: 0.5255,
          longitude: 9.4312,
          rating: 5.0,
          reviewCount: 58,
          verificationStatus: 'VERIFIED',
          distanceKm: 1.1,
          user: { firstName: 'Sylvie', lastName: 'Nzamba' },
        },
        {
          id: 'doc-3',
          userId: 'u-d-3',
          title: 'Dr.',
          specialty: 'Médecine Générale',
          subSpecialties: 'Bilan de santé, Paludisme, Médecine de famille',
          bio: 'Médecin généraliste à l\'écoute pour tout motif médical adulte et pédiatrique.',
          consultationFee: 15000,
          acceptsCnamgs: true,
          acceptsTeleconsult: false,
          acceptsHomeVisit: true,
          address: 'Avenue de la Nation, Montagne Sainte',
          city: 'Libreville',
          district: 'Centre-ville',
          latitude: 0.395,
          longitude: 9.451,
          rating: 4.7,
          reviewCount: 31,
          verificationStatus: 'VERIFIED',
          distanceKm: 4.6,
          user: { firstName: 'Christian', lastName: 'Bekale' },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadDoctors, 350);
    return () => window.clearTimeout(timer);
  }, [selectedSpecialty, onlyTeleconsult, onlyCnamgs, search]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
            <Stethoscope className="w-3.5 h-3.5" /> Praticiens Inscrits à l'Ordre des Médecins
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Médecins Spécialistes et Prise de Rendez-vous
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl">
            Prenez rendez-vous en cabinet, à domicile ou en téléconsultation avec des médecins vérifiés et conventionnés CNAMGS au Gabon.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom de médecin ou motif..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={() => setOnlyTeleconsult(!onlyTeleconsult)}
                className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  onlyTeleconsult
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Téléconsultation disponible
              </button>

              <button
                onClick={() => setOnlyCnamgs(!onlyCnamgs)}
                className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  onlyCnamgs
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Accepte CNAMGS
              </button>
            </div>
          </div>

          {/* Specialty Tags */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold shrink-0">Spécialité :</span>
            {specialties.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
                  selectedSpecialty === spec
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {spec === 'ALL' ? 'Toutes les spécialités' : spec}
              </button>
            ))}
          </div>
        </div>

        {/* Doctors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const docName = doc.user ? `${doc.title || 'Dr.'} ${doc.user.firstName} ${doc.user.lastName}` : `${doc.title || 'Dr.'} Spécialiste`;
            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-blue-300 hover:shadow-lg transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-blue-500/20">
                      {doc.user ? doc.user.firstName[0] + doc.user.lastName[0] : 'DR'}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">
                        {doc.consultationFee.toLocaleString()} FCFA
                      </span>
                      <span className="text-[10px] text-slate-400">Tarif conventionné</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-extrabold text-slate-900">{docName}</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {doc.title === 'Infirmier(ère)' ? 'Profession vérifiée ✓' : 'Ordre Médecins ✓'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-blue-700 mt-0.5">{doc.specialty}</p>
                    {doc.subSpecialties && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{doc.subSpecialties}</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {doc.address}, {doc.city}
                    {doc.distanceKm !== undefined && (
                      <strong className="text-blue-700 ml-1">({doc.distanceKm} km)</strong>
                    )}
                  </p>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                    {doc.acceptsCnamgs && (
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> CNAMGS
                      </span>
                    )}
                    {doc.acceptsTeleconsult && (
                      <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Video className="w-3 h-3" /> Téléconsult.
                      </span>
                    )}
                    {doc.acceptsHomeVisit && (
                      <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Home className="w-3 h-3" /> Domicile
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>{doc.rating}</span>
                    <span className="text-slate-400 text-[10px] font-normal">({doc.reviewCount} avis)</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setIsBookingOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" /> Prendre RDV
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DoctorBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        doctor={selectedDoctor}
        onSuccess={() => {
          loadDoctors();
        }}
      />
    </div>
  );
};
