import React, { useState, useEffect } from 'react';
import { Building2, Mail, MapPin, Phone, ShieldCheck, Activity, PhoneCall } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ClinicProfile } from '../types';
import { realClinics } from '../data/realDirectory';

type FacilitiesMode = 'emergency' | 'hospitals';

const fallbackFacilities: ClinicProfile[] = [
  ...realClinics,
  {
    id: 'clin-1',
    userId: 'u-c-1',
    name: 'Centre Hospitalier Universitaire de Libreville (CHUL)',
    type: 'HOSPITAL',
    address: "Boulevard de l'Indépendance",
    city: 'Libreville',
    district: 'Centre-ville',
    latitude: 0.391,
    longitude: 9.449,
    phone: '+241 11 76 20 00',
    emergencyPhone247: '+241 11 76 20 00',
    hasEmergency247: true,
    acceptsCnamgs: true,
    services: ['Urgences 24/7', 'Réanimation', 'Cardiologie', 'Chirurgie', 'Maternité', 'Laboratoire', 'Scanner'],
    distanceKm: 4.8,
  },
  {
    id: 'clin-2',
    userId: 'u-c-2',
    name: 'Polyclinique El Rapha',
    type: 'CLINIC',
    address: 'Carrefour Angondjé, Voie Express',
    city: 'Libreville',
    district: 'Akanda',
    latitude: 0.5289,
    longitude: 9.4345,
    phone: '+241 11 73 73 73',
    emergencyPhone247: '+241 07 20 20 20',
    hasEmergency247: true,
    acceptsCnamgs: true,
    services: ['Urgences 24/7', 'Scanner et IRM', 'Laboratoire 24/7', 'Pédiatrie et Maternité', 'Ambulance'],
    distanceKm: 1.4,
  },
];

const hospitalTypes = new Set(['HOSPITAL', 'CLINIC', 'POLYCLINIC', 'MATERNITY']);

const normalizeClinicName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const serviceListFor = (clinic: ClinicProfile) => {
  if (Array.isArray(clinic.services)) return clinic.services;
  if (typeof clinic.services !== 'string') return [];

  try {
    const parsed = JSON.parse(clinic.services);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return clinic.services
      .split(',')
      .map((service) => service.trim())
      .filter(Boolean);
  }
};

const shouldShowFacility = (clinic: ClinicProfile, mode: FacilitiesMode) => {
  const type = clinic.type?.toUpperCase();

  if (mode === 'hospitals') {
    return hospitalTypes.has(type);
  }

  return clinic.hasEmergency247 || type === 'EMERGENCY_SERVICE';
};

const FacilitiesPage: React.FC<{ mode: FacilitiesMode }> = ({ mode }) => {
  const { userLocation } = useAuth();
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const mergeWithLocalClinics = (apiClinics: ClinicProfile[]) => {
    const merged = [...fallbackFacilities];
    const knownNames = new Set(merged.map((clinic) => normalizeClinicName(clinic.name)));

    apiClinics.forEach((clinic) => {
      const normalizedName = normalizeClinicName(clinic.name);
      if (!knownNames.has(normalizedName)) {
        merged.push({
          ...clinic,
          emergencyPhone247: clinic.emergencyPhone247 === '1300' ? clinic.phone : clinic.emergencyPhone247,
        });
        knownNames.add(normalizedName);
      }
    });

    return merged;
  };

  const emergencyDialNumber = (clinic: ClinicProfile) =>
    (clinic.emergencyPhone247 === '1300' ? clinic.phone : clinic.emergencyPhone247 || clinic.phone).replace(/\s+/g, '');

  useEffect(() => {
    const loadClinics = async () => {
      setLoading(true);
      try {
        const data = await api.listClinics({
          lat: userLocation.lat,
          lng: userLocation.lng,
        });
        setClinics(mergeWithLocalClinics(data || []));
      } catch (err) {
        console.warn('Fallback clinics list:', err);
        setClinics(fallbackFacilities);
      } finally {
        setLoading(false);
      }
    };
    loadClinics();
  }, [userLocation]);

  const visibleClinics = clinics.filter((clinic) => shouldShowFacility(clinic, mode));
  const isHospitals = mode === 'hospitals';
  const accent = isHospitals ? 'blue' : 'rose';
  const emptyLabel = isHospitals ? 'Aucun hôpital disponible pour le moment.' : 'Aucun service d’urgence disponible pour le moment.';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full ${
            isHospitals ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {isHospitals ? <Building2 className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
            {isHospitals ? 'Hôpitaux, cliniques et polycliniques' : 'Urgences Vitales et Contacts 24/7'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isHospitals ? 'Établissements Hospitaliers' : 'Urgences et Assistance Immédiate'}
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl">
            {isHospitals
              ? 'Centres hospitaliers, cliniques, polycliniques et maternités utiles pour l’orientation médicale au Gabon.'
              : 'SAMU Social, services d’urgence et contacts rapides disponibles pour une prise en charge immédiate.'}
          </p>
        </div>

        {/* SAMU Card */}
        {!isHospitals && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center sm:text-left">
              <span className="bg-rose-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full">
                Gratuit 7j/7 et 24h/24
              </span>
              <h3 className="text-2xl font-black">SAMU Social Gabonais</h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                Consultations gratuites, examens gratuits et assistance sanitaire/sociale. Généraliste et sage-femme à domicile 24h/24.
              </p>
            </div>
            <a
              href="tel:1488"
              className="px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-lg transition shadow-lg shadow-rose-600/30 flex items-center gap-2"
            >
              <PhoneCall className="w-6 h-6 animate-pulse" /> Appeler le 1488
            </a>
          </div>
        )}

        {/* Clinics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleClinics.map((clinic) => {
            const serviceList = serviceListFor(clinic);

            return (
              <div
                key={clinic.id}
                className={`bg-white rounded-3xl p-6 border border-slate-200/80 hover:shadow-lg transition space-y-4 ${
                  isHospitals ? 'hover:border-blue-300' : 'hover:border-rose-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${
                    isHospitals ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    🏥
                  </div>
                  {clinic.hasEmergency247 && (
                    <span className="bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                      🚨 Urgences 24h/24
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{clinic.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {clinic.address}, {clinic.city}
                    {clinic.distanceKm !== undefined && (
                      <strong className={`${isHospitals ? 'text-blue-700' : 'text-rose-700'} ml-1`}>({clinic.distanceKm} km)</strong>
                    )}
                  </p>
                  {clinic.email && (
                    <a
                      href={`mailto:${clinic.email}`}
                      className={`text-xs text-slate-500 flex items-center gap-1 mt-1 ${
                        isHospitals ? 'hover:text-blue-700' : 'hover:text-rose-700'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {clinic.email}
                    </a>
                  )}
                </div>

                {/* Services Tags */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Services Disponibles
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {serviceList.map((srv: string) => (
                      <span
                        key={srv}
                        className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                      >
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {clinic.acceptsCnamgs && (
                    <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> CNAMGS Prise en charge
                    </span>
                  )}

                  <a
                    href={`tel:${emergencyDialNumber(clinic)}`}
                    className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm ${
                      isHospitals ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" /> {isHospitals ? 'Appeler' : 'Appeler Urgence'} ({clinic.phone})
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && visibleClinics.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
};

export const ClinicsPage: React.FC = () => <FacilitiesPage mode="emergency" />;

export const HospitalsPage: React.FC = () => <FacilitiesPage mode="hospitals" />;
