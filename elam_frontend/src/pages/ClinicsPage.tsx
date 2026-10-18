import React, { useState, useEffect } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Activity,
  PhoneCall,
  Plus,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ClinicProfile } from "../types";
import { realClinics } from "../data/realDirectory";

type FacilitiesMode = "emergency" | "hospitals";

const fallbackFacilities: ClinicProfile[] = realClinics;

const hospitalTypes = new Set([
  "HOSPITAL",
  "CLINIC",
  "POLYCLINIC",
  "MATERNITY",
]);

const normalizeClinicName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const serviceListFor = (clinic: ClinicProfile) => {
  if (Array.isArray(clinic.services)) return clinic.services;
  if (typeof clinic.services !== "string") return [];

  try {
    const parsed = JSON.parse(clinic.services);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return clinic.services
      .split(",")
      .map((service) => service.trim())
      .filter(Boolean);
  }
};

const shouldShowFacility = (clinic: ClinicProfile, mode: FacilitiesMode) => {
  const type = clinic.type?.toUpperCase();

  if (mode === "hospitals") {
    return hospitalTypes.has(type);
  }

  return (
    clinic.hasEmergency247 ||
    type === "EMERGENCY_SERVICE" ||
    type === "HEALTH_ORGANIZATION"
  );
};

const FacilitiesPage: React.FC<{ mode: FacilitiesMode }> = ({ mode }) => {
  const { userLocation } = useAuth();
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const mergeWithLocalClinics = (apiClinics: ClinicProfile[]) => {
    const merged = [...fallbackFacilities];
    const knownNames = new Set(
      merged.map((clinic) => normalizeClinicName(clinic.name)),
    );

    apiClinics.forEach((clinic) => {
      const normalizedName = normalizeClinicName(clinic.name);
      if (!knownNames.has(normalizedName)) {
        merged.push({
          ...clinic,
          emergencyPhone247:
            clinic.emergencyPhone247 === "1300"
              ? clinic.phone
              : clinic.emergencyPhone247,
        });
        knownNames.add(normalizedName);
      }
    });

    return merged;
  };

  const emergencyDialNumber = (clinic: ClinicProfile) =>
    (clinic.emergencyPhone247 === "1300"
      ? clinic.phone
      : clinic.emergencyPhone247 || clinic.phone
    ).replace(/\s+/g, "");

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
        console.warn("Fallback clinics list:", err);
        setClinics(fallbackFacilities);
      } finally {
        setLoading(false);
      }
    };
    loadClinics();
  }, [userLocation]);

  const samuSocial =
    clinics.find((clinic) => clinic.id === "clin-samu-social-gabonais") ||
    realClinics.find((clinic) => clinic.id === "clin-samu-social-gabonais");
  // Keep this verified local directory entry as the source for the featured
  // card, so it stays visible even when the API directory is unavailable.
  const croixRouge = realClinics.find(
    (clinic) => clinic.id === "clin-croix-rouge-gabonaise",
  )!;
  const visibleClinics = clinics.filter(
    (clinic) =>
      shouldShowFacility(clinic, mode) &&
      (mode === "hospitals" ||
        (clinic.id !== samuSocial?.id && clinic.id !== croixRouge?.id)),
  );
  const isHospitals = mode === "hospitals";
  const accent = isHospitals ? "blue" : "rose";
  const emptyLabel = isHospitals
    ? "Aucun hôpital disponible pour le moment."
    : "Aucun service d’urgence disponible pour le moment.";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div
            className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full ${
              isHospitals
                ? "bg-blue-100 text-blue-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {isHospitals ? (
              <Building2 className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            {isHospitals
              ? "Hôpitaux, cliniques et polycliniques"
              : "Urgences Vitales et Contacts 24/7"}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isHospitals
              ? "Établissements Hospitaliers"
              : "Urgences et Assistance Immédiate"}
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl">
            {isHospitals
              ? "Centres hospitaliers, cliniques, polycliniques et maternités utiles pour l’orientation médicale au Gabon."
              : "SAMU Social, services d’urgence et contacts rapides disponibles pour une prise en charge immédiate."}
          </p>
        </div>

        {/* Priority emergency contacts */}
        {!isHospitals && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-xl">
              <div className="space-y-2">
                <span className="bg-rose-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full">
                  Gratuit 7j/7 et 24h/24
                </span>
                <h3 className="text-2xl font-black">SAMU Social Gabonais</h3>
                <p className="text-slate-300 text-xs sm:text-sm">
                  Consultations et examens gratuits, assistance sanitaire et
                  sociale, généraliste et sage-femme à domicile.
                </p>
              </div>
              <a
                href={`tel:${samuSocial?.phone.replace(/[^\\d+]/g, "") || "1488"}`}
                className="self-start px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base transition shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                <PhoneCall className="w-5 h-5" /> Appeler le{" "}
                {samuSocial?.phone || "1488"}
              </a>
            </section>

            <section className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-rose-300 flex flex-col justify-between gap-5 shadow-sm">
                <div className="space-y-3">
                  <span className="inline-flex bg-rose-50 text-rose-800 text-xs font-black uppercase px-2.5 py-1 rounded-full">
                    ONG · Assistance et premiers secours
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm" aria-hidden="true">
                      <Plus className="h-8 w-8" strokeWidth={4} />
                    </span>
                    <h3 className="text-2xl font-black text-slate-900">
                      Croix-Rouge Gabonaise
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      {croixRouge.address}, {croixRouge.city}
                      <br />
                      BP 2274 Libreville
                    </span>
                  </p>
                  {croixRouge.email && (
                    <a
                      href={`mailto:${croixRouge.email}`}
                      className="text-sm text-slate-600 hover:text-rose-700 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 text-rose-600 shrink-0" />
                      {croixRouge.email}
                    </a>
                  )}
                </div>
                <a
                  href={`tel:${croixRouge.phone.replace(/[^\\d+]/g, "")}`}
                  className="self-start px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base transition flex items-center gap-2"
                >
                  <PhoneCall className="w-5 h-5" /> Appeler {croixRouge.phone}
                </a>
            </section>
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
                  isHospitals
                    ? "hover:border-blue-300"
                    : "hover:border-rose-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${
                      isHospitals
                        ? "bg-blue-50 text-blue-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    🏥
                  </div>
                  {clinic.hasEmergency247 && (
                    <span className="bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                      🚨 Urgences 24h/24
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {clinic.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {clinic.address}, {clinic.city}
                    {clinic.distanceKm !== undefined && (
                      <strong
                        className={`${isHospitals ? "text-blue-700" : "text-rose-700"} ml-1`}
                      >
                        ({clinic.distanceKm} km)
                      </strong>
                    )}
                  </p>
                  {clinic.email && (
                    <a
                      href={`mailto:${clinic.email}`}
                      className={`text-xs text-slate-500 flex items-center gap-1 mt-1 ${
                        isHospitals
                          ? "hover:text-blue-700"
                          : "hover:text-rose-700"
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
                      <ShieldCheck className="w-3.5 h-3.5" /> CNAMGS Prise en
                      charge
                    </span>
                  )}

                  <a
                    href={`tel:${emergencyDialNumber(clinic)}`}
                    className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm ${
                      isHospitals
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />{" "}
                    {isHospitals ? "Appeler" : "Appeler Urgence"} (
                    {clinic.phone})
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

export const HospitalsPage: React.FC = () => (
  <FacilitiesPage mode="hospitals" />
);
