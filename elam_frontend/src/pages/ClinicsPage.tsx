import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, ShieldCheck, Activity, PhoneCall } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ClinicProfile } from '../types';

export const ClinicsPage: React.FC = () => {
  const { userLocation } = useAuth();
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadClinics = async () => {
      setLoading(true);
      try {
        const data = await api.listClinics({
          lat: userLocation.lat,
          lng: userLocation.lng,
        });
        setClinics(data || []);
      } catch (err) {
        console.warn('Fallback clinics list:', err);
        setClinics([
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
            emergencyPhone247: '1300',
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
            services: ['Urgences 24/7', 'Scanner & IRM', 'Laboratoire 24/7', 'Pédiatrie & Maternité', 'Ambulance'],
            distanceKm: 1.4,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadClinics();
  }, [userLocation]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full">
            <Activity className="w-3.5 h-3.5" /> Urgences Vitales & Hôpitaux Référents
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Établissements Hospitaliers & Urgences 24/7
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl">
            Centres hospitaliers, polycliniques et maternités équipés pour les urgences médicales et examens complémentaires au Gabon.
          </p>
        </div>

        {/* SAMU Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <span className="bg-rose-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full">
              Urgence Immédiate
            </span>
            <h3 className="text-2xl font-black">Numéro d'Urgence National SAMU Gabon</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              En cas de détresse vitale, malaise cardiaque ou accident grave, composez le numéro gratuit.
            </p>
          </div>
          <a
            href="tel:1300"
            className="px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-lg transition shadow-lg shadow-rose-600/30 flex items-center gap-2"
          >
            <PhoneCall className="w-6 h-6 animate-pulse" /> Appeler le 1300
          </a>
        </div>

        {/* Clinics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clinics.map((clinic) => {
            const serviceList = Array.isArray(clinic.services)
              ? clinic.services
              : typeof clinic.services === 'string'
              ? JSON.parse(clinic.services)
              : [];

            return (
              <div
                key={clinic.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-rose-300 hover:shadow-lg transition space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xl">
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
                      <strong className="text-rose-700 ml-1">({clinic.distanceKm} km)</strong>
                    )}
                  </p>
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
                    href={`tel:${(clinic.emergencyPhone247 || clinic.phone).replace(/\s+/g, '')}`}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" /> Appeler Accueil ({clinic.phone})
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
