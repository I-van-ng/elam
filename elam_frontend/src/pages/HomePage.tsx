import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Pill,
  Stethoscope,
  Building2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Phone,
  Flame,
  CalendarCheck,
  Sparkles,
  Map as MapIcon,
  CheckCircle2,
  AlertCircle,
  Video,
} from "lucide-react";
import { HealthMap } from "../components/HealthMap";
import { MedicationAvailabilityModal } from "../components/MedicationAvailabilityModal";
import { DoctorBookingModal } from "../components/DoctorBookingModal";
import { isDoctorProfileLinked } from "../utils/doctorBooking";
import { ReservationModal } from "../components/ReservationModal";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  DoctorProfile,
  PharmacyProfile,
  ClinicProfile,
  MedicationSearchResult,
  MedicationAvailabilityOffer,
} from "../types";
import {
  realClinics,
  realDoctors,
  realPharmacies,
} from "../data/realDirectory";

export const HomePage: React.FC = () => {
  const { user, userLocation } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [mapTypeFilter, setMapTypeFilter] = useState<
    "ALL" | "PHARMACY" | "DOCTOR" | "CLINIC"
  >("ALL");
  const [mapZoneFilter, setMapZoneFilter] = useState("Toutes zones");

  const [pharmacies, setPharmacies] = useState<PharmacyProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [selectedMedResult, setSelectedMedResult] =
    useState<MedicationSearchResult | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(
    null,
  );
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

  const [selectedOfferForReserve, setSelectedOfferForReserve] = useState<{
    offer: MedicationAvailabilityOffer;
    medicationName: string;
    medicationId: string;
  } | null>(null);

  const normalizeKey = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const mergePharmaciesWithLocalDirectory = (
    apiPharmacies: PharmacyProfile[],
  ) => {
    const merged = [...realPharmacies];
    const knownNames = new Set(
      merged.map((pharmacy) => normalizeKey(pharmacy.name)),
    );

    apiPharmacies.forEach((pharmacy) => {
      const normalizedName = normalizeKey(pharmacy.name);
      if (!knownNames.has(normalizedName)) {
        merged.push(pharmacy);
        knownNames.add(normalizedName);
      }
    });

    return merged;
  };

  const mergeDoctorsWithLocalDirectory = (apiDoctors: DoctorProfile[]) => {
    const merged = realDoctors.map((localDoctor) => {
      const localName = normalizeKey(
        `${localDoctor.user?.firstName || ""}${localDoctor.user?.lastName || ""}`,
      );
      const apiDoctor = apiDoctors.find(
        (doctor) =>
          normalizeKey(
            `${doctor.user?.firstName || ""}${doctor.user?.lastName || ""}`,
          ) === localName,
      );

      return apiDoctor
        ? {
            ...localDoctor,
            ...apiDoctor,
            user: apiDoctor.user ?? localDoctor.user,
          }
        : localDoctor;
    });
    const knownNames = new Set(
      merged.map((doctor) =>
        normalizeKey(
          `${doctor.user?.firstName || ""}${doctor.user?.lastName || ""}`,
        ),
      ),
    );

    apiDoctors.forEach((doctor) => {
      const normalizedName = normalizeKey(
        `${doctor.user?.firstName || ""}${doctor.user?.lastName || ""}`,
      );
      if (!knownNames.has(normalizedName)) {
        merged.push(doctor);
        knownNames.add(normalizedName);
      }
    });

    return merged;
  };

  const mergeClinicsWithLocalDirectory = (apiClinics: ClinicProfile[]) => {
    const merged = [...realClinics];
    const knownNames = new Set(
      merged.map((clinic) => normalizeKey(clinic.name)),
    );

    apiClinics.forEach((clinic) => {
      const normalizedName = normalizeKey(clinic.name);
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

  const loadData = async (query = "") => {
    setLoading(true);
    try {
      if (
        query &&
        (query.toLowerCase().includes("amox") ||
          query.toLowerCase().includes("doli") ||
          query.toLowerCase().includes("coart") ||
          query.toLowerCase().includes("vent") ||
          query.toLowerCase().includes("parac"))
      ) {
        const medResults = await api.searchMedicationAvailability(
          query,
          userLocation.lat,
          userLocation.lng,
        );
        if (medResults && medResults.length > 0) {
          setSelectedMedResult(medResults[0]);
          setIsMedModalOpen(true);
        }
      }

      const res = await api.searchNearby({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm: 25,
        query: query || undefined,
      });

      if (res && res.results) {
        setPharmacies(
          mergePharmaciesWithLocalDirectory(res.results.pharmacies || []),
        );
        setDoctors(mergeDoctorsWithLocalDirectory(res.results.doctors || []));
        setClinics(
          mergeClinicsWithLocalDirectory(res.results.emergencyClinics || []),
        );
      }
    } catch (err) {
      console.warn("Fallback local data:", err);
      // Fallback
      setPharmacies(realPharmacies);

      setDoctors(realDoctors);

      setClinics(mergeClinicsWithLocalDirectory([]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const handleQuickPill = (keyword: string) => {
    setSearchQuery(keyword);
    loadData(keyword);
  };

  const namedDoctors = doctors.filter((doc) => doc.user);
  const normalizeSearchText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const matchesSearch = (query: string, fields: (string | undefined)[]) => {
    const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
    const content = normalizeSearchText(fields.filter(Boolean).join(" "));
    return terms.length > 0 && terms.every((term) => content.includes(term));
  };
  const searchSections = [
    {
      title: "Pharmacies et médicaments",
      description: "Pharmacies, stocks et pharmacies de garde",
      keywords: "pharmacie médicament médicaments stock garde officine",
      to: "/pharmacies",
    },
    {
      title: "Médecins et rendez-vous",
      description: "Trouver un médecin ou une spécialité",
      keywords: "médecin docteur consultation rendez-vous spécialiste",
      to: "/doctors",
    },
    {
      title: "Urgences et assistance",
      description: "Services d’urgence et contacts utiles",
      keywords: "urgence urgences samu secours assistance ambulance",
      to: "/clinics",
    },
    {
      title: "Hôpitaux et cliniques",
      description: "Établissements de santé au Gabon",
      keywords: "hôpital hôpitaux clinique polyclinique maternité",
      to: "/hospitals",
    },
    {
      title: "Tarifs et offres",
      description: "Consulter les formules et tarifs ELAM",
      keywords: "tarif tarifs prix offre offres abonnement paiement",
      to: "/pricing",
    },
  ];
  const query = searchQuery.trim();
  const searchResults =
    query.length < 2
      ? []
      : [
          ...searchSections
            .filter((section) =>
              matchesSearch(query, [section.title, section.keywords]),
            )
            .map((section) => ({
              key: section.to,
              title: section.title,
              description: section.description,
              type: "Rubrique",
              to: section.to,
            })),
          ...namedDoctors
            .filter((doc) =>
              matchesSearch(query, [
                doc.title,
                doc.user?.firstName,
                doc.user?.lastName,
                doc.specialty,
                doc.subSpecialties,
                doc.bio,
                doc.address,
                doc.district,
                doc.city,
              ]),
            )
            .map((doc) => ({
              key: doc.id,
              title: `${doc.title || "Dr."} ${doc.user?.firstName} ${doc.user?.lastName}`,
              description: `${doc.specialty} · ${doc.district || doc.city}`,
              type: "Médecin",
              to: "/doctors",
            })),
          ...pharmacies
            .filter((pharmacy) =>
              matchesSearch(query, [
                pharmacy.name,
                pharmacy.address,
                pharmacy.city,
                pharmacy.district,
                pharmacy.phone,
                pharmacy.openingHours,
              ]),
            )
            .map((pharmacy) => ({
              key: pharmacy.id,
              title: pharmacy.name,
              description: `${pharmacy.district || pharmacy.address} · ${pharmacy.phone}`,
              type: "Pharmacie",
              to: "/pharmacies",
            })),
          ...clinics
            .filter((clinic) =>
              matchesSearch(query, [
                clinic.name,
                clinic.type,
                clinic.address,
                clinic.city,
                clinic.district,
                clinic.phone,
                clinic.email,
                ...(Array.isArray(clinic.services)
                  ? clinic.services
                  : [clinic.services]),
              ]),
            )
            .map((clinic) => ({
              key: clinic.id,
              title: clinic.name,
              description: `${clinic.address} · ${clinic.phone}`,
              type: "Urgence / établissement",
              to: "/clinics",
            })),
        ].slice(0, 8);

  // Map markers
  const mapMarkers = [
    ...pharmacies.map((p) => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      title: p.name,
      subtitle: `${p.district || p.address} (${p.distanceKm || 0} km)`,
      type: "PHARMACY" as const,
      isOnDuty: p.isOnDuty,
      phone: p.phone,
      badge: p.acceptsCnamgs ? "CNAMGS ✓" : undefined,
      zone:
        p.city === "Owendo"
          ? "Owendo"
          : p.city === "Akanda"
            ? "Akanda"
            : p.district || p.city,
      positionConfirmed: p.positionConfirmed,
    })),
    ...namedDoctors.map((d) => ({
      id: d.id,
      lat: d.latitude,
      lng: d.longitude,
      title: d.user
        ? `${d.title || "Dr."} ${d.user.firstName} ${d.user.lastName}`
        : `${d.title || "Dr."} Spécialiste`,
      subtitle: `${d.specialty} - ${d.consultationFee.toLocaleString()} FCFA`,
      type: "DOCTOR" as const,
      phone: d.user?.phone,
      badge: d.acceptsCnamgs ? "CNAMGS ✓" : "Sans assurance",
      zone:
        d.city === "Owendo"
          ? "Owendo"
          : d.city === "Akanda"
            ? "Akanda"
            : d.district || d.city,
      positionConfirmed: d.positionConfirmed,
    })),
    ...clinics.map((c) => ({
      id: c.id,
      lat: c.latitude,
      lng: c.longitude,
      title: c.name,
      subtitle: `Urgences 24/7 - ${c.city}`,
      type: "CLINIC" as const,
      phone: c.phone,
      badge: "Urgences 24/7",
      zone:
        c.city === "Owendo"
          ? "Owendo"
          : c.city === "Akanda"
            ? "Akanda"
            : c.district || c.city,
      positionConfirmed: c.positionConfirmed,
    })),
  ];

  const mapZones = useMemo(() => {
    const zones = Array.from(
      new Set(mapMarkers.map((marker) => marker.zone).filter(Boolean)),
    ) as string[];
    const priority = ["Akanda", "Libreville", "Centre-ville", "Owendo"];

    return [
      "Toutes zones",
      ...zones.sort((a, b) => {
        const indexA = priority.indexOf(a);
        const indexB = priority.indexOf(b);
        if (indexA !== -1 || indexB !== -1) {
          return (
            (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
          );
        }
        return a.localeCompare(b);
      }),
    ];
  }, [mapMarkers]);

  const filteredMapMarkers = useMemo(() => {
    return mapMarkers.filter((marker) => {
      const matchesType =
        mapTypeFilter === "ALL" || marker.type === mapTypeFilter;
      const matchesZone =
        mapZoneFilter === "Toutes zones" || marker.zone === mapZoneFilter;
      return matchesType && matchesZone;
    });
  }, [mapMarkers, mapTypeFilter, mapZoneFilter]);

  const mapFilterButtons = [
    { label: "Tout", value: "ALL" as const },
    { label: "Pharmacies", value: "PHARMACY" as const },
    { label: "Médecins", value: "DOCTOR" as const },
    { label: "Urgences", value: "CLINIC" as const },
  ];

  return (
    <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 max-w-4xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* 1. Welcoming Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs font-semibold text-slate-400">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
            {user ? `Bonjour ${user.firstName}` : "Bienvenue sur ELAM"} 👋
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {user
              ? "Comment vous sentez-vous aujourd'hui ?"
              : "Trouvez rapidement un médecin, une pharmacie ou une urgence."}
          </p>
        </div>

        {user && (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-emerald-500/20">
            {user.firstName[0] + user.lastName[0]}
          </div>
        )}
      </div>

      {/* 2. Modern Floating Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-emerald-400 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 p-1.5 transition-all">
          <div className="pl-3 text-emerald-600">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Médicament, médecin, spécialité ou pharmacie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          <button
            type="submit"
            className="tap-active bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            Chercher
          </button>
        </div>
        {query.length >= 2 && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {searchResults.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {searchResults.map((result) => (
                  <Link
                    key={result.key}
                    to={result.to}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {result.description}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {result.type}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-500">
                Aucun résultat dans les rubriques et annuaires chargés.
              </p>
            )}
          </div>
        )}
      </form>

      {/* 2.5 Emergency & First-Aid AI Banner */}
      <Link
        to="/emergency-ai"
        className="tap-active block relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 sm:p-5 text-white shadow-xl shadow-rose-600/20 border border-red-500/30 group hover:scale-[1.01] transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur text-[10px] font-black uppercase tracking-wider text-rose-100">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>Nouveau · IA d'Urgence Vitale</span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              Que faire avant l'arrivée des secours ?
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-rose-100 max-w-md">
              Guidage immédiat pas à pas (arrêt cardiaque, étouffement, hémorragie, PLS) + appel direct SAMU Social Gabonais 1488 & Pompiers 18.
            </p>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl sm:text-3xl shrink-0 group-hover:scale-110 transition-transform">
            🚨
          </div>
        </div>
      </Link>

      {/* Mission and long-term ambition */}
      <section
        aria-labelledby="elam-mission-title"
        className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 sm:p-6 shadow-sm"
      >
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            ELAM Santé · Gabon
          </p>
          <h2
            id="elam-mission-title"
            className="mt-1 text-lg sm:text-xl font-black tracking-tight text-slate-900"
          >
            La santé plus simple, plus proche
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            ELAM rapproche les patients et les professionnels de santé. La
            plateforme aide chacun à rechercher un médicament, une pharmacie de
            garde, un médecin ou un établissement de santé, et à simplifier ses
            démarches pour accéder aux soins.
          </p>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-white/80 p-4">
          <h3 className="text-xs font-black uppercase tracking-wide text-emerald-800">
            Notre ambition
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Devenir un acteur de référence de la santé numérique dans la
            sous-région, en facilitant l’accès aux soins pour les patients et le
            travail des professionnels de santé.
          </p>
        </div>
      </section>

      {/* 3. Quick Action Hub (4 Clean Touch Tiles) */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tile 1: Chercher Médicament */}
          <button
            onClick={() => handleQuickPill("Amoxicilline")}
            className="tap-active bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition text-left flex flex-col justify-between h-28 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              💊
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 leading-tight">
                Médicament
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                Stocks en direct
              </p>
            </div>
          </button>

          {/* Tile 2: Pharmacie de Garde */}
          <button
            onClick={() => handleQuickPill("Pharmacie de garde")}
            className="tap-active bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-amber-300 hover:shadow-md transition text-left flex flex-col justify-between h-28 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🌙
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 leading-tight">
                Pharmacie Garde
              </p>
              <p className="text-[10px] text-amber-600 font-bold">
                Ouvertes 24h
              </p>
            </div>
          </button>

          {/* Tile 3: Prendre RDV Médecin */}
          <Link
            to="/doctors"
            className="tap-active bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition text-left flex flex-col justify-between h-28 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🩺
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 leading-tight">
                Médecins
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                Prise de RDV
              </p>
            </div>
          </Link>

          {/* Tile 4: Urgences 24/7 */}
          <a
            href="tel:1488"
            className="tap-active bg-gradient-to-br from-rose-500 to-rose-600 text-white p-4 rounded-3xl shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition text-left flex flex-col justify-between h-28 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🚨
            </div>
            <div>
              <p className="text-xs font-black text-white leading-tight">
                Urgences 1488
              </p>
              <p className="text-[10px] text-rose-100 font-semibold">
                SAMU Social
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* 4. Map View */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-emerald-700" />
              Carte santé du Grand Libreville
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Libreville, Akanda, Owendo, PK et quartiers proches
            </p>
          </div>

          <button
            onClick={() => setShowMap(!showMap)}
            className="tap-active self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-full transition"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{showMap ? "Masquer la carte" : "Afficher la carte"}</span>
          </button>
        </div>

        {showMap && (
          <>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="grid grid-cols-4 gap-1 bg-slate-100 rounded-2xl p-1 flex-1">
                {mapFilterButtons.map((button) => (
                  <button
                    key={button.value}
                    onClick={() => setMapTypeFilter(button.value)}
                    className={`tap-active rounded-xl px-2 py-1.5 text-[10px] font-extrabold transition ${
                      mapTypeFilter === button.value
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>

              <select
                value={mapZoneFilter}
                onChange={(event) => setMapZoneFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
              >
                {mapZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-200">
              <HealthMap
                center={[userLocation.lat, userLocation.lng]}
                markers={filteredMapMarkers}
                userLocation={[userLocation.lat, userLocation.lng]}
                heightClass="h-[420px] sm:h-[500px]"
              />
            </div>
          </>
        )}
      </div>

      {/* 5. Section: Pharmacies de Garde et Stocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>🌙 Pharmacies de garde et Ouvertes</span>
          </h3>
          <Link
            to="/pharmacies"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
          >
            Voir tout <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {pharmacies.slice(0, 2).map((pharm) => (
            <div
              key={pharm.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base">
                    💊
                  </div>
                  {pharm.isOnDuty ? (
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                      🌙 Pharmacie de Garde
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Ouverte
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {pharm.name}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {pharm.district || pharm.address}
                    {pharm.distanceKm !== undefined && (
                      <strong className="text-emerald-700 ml-1">
                        ({pharm.distanceKm} km)
                      </strong>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{pharm.openingHours}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{pharm.phone}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`tel:${pharm.phone.split("/")[0].replace(/\s+/g, "")}`}
                  className="tap-active px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Appeler
                </a>
                <button
                  onClick={() => {
                    setSearchQuery("Amoxicilline");
                    loadData("Amoxicilline");
                  }}
                  className="tap-active px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Voir les stocks
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Section: Médecins Disponibles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>🩺 Médecins Disponibles</span>
          </h3>
          <Link
            to="/doctors"
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-0.5"
          >
            Voir tout <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {namedDoctors.slice(0, 2).map((doc) => {
            const docName = doc.user
              ? `${doc.title || "Dr."} ${doc.user.firstName} ${doc.user.lastName}`
              : `${doc.title || "Dr."} Spécialiste`;
            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                      {doc.user
                        ? doc.user.firstName[0] + doc.user.lastName[0]
                        : "DR"}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        {doc.consultationFee.toLocaleString()} FCFA
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          doc.acceptsCnamgs
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-amber-700 bg-amber-50"
                        }`}
                      >
                        {doc.acceptsCnamgs ? "CNAMGS ✓" : "Sans assurance"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        {docName}
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1 rounded">
                        ✓
                      </span>
                    </div>
                    <p className="text-xs font-bold text-blue-700">
                      {doc.specialty}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {doc.district || doc.address}
                      {doc.distanceKm !== undefined && (
                        <strong className="text-blue-700 ml-1">
                          ({doc.distanceKm} km)
                        </strong>
                      )}
                    </p>
                    {doc.bio && (
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5 line-clamp-2">
                        {doc.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      ★ {doc.rating}
                    </span>
                    {isDoctorProfileLinked(doc.id) ? (
                      <button
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setIsDoctorModalOpen(true);
                        }}
                        className="tap-active shrink-0 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" /> Prendre RDV
                      </button>
                    ) : doc.user?.phone ? (
                      <a
                        href={`tel:${doc.user.phone.split("/")[0].replace(/[^\d+]/g, "")}`}
                        className="tap-active shrink-0 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> Appeler
                      </a>
                    ) : (
                      <button
                        disabled
                        className="shrink-0 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500"
                      >
                        Réservation indisponible
                      </button>
                    )}
                  </div>

                  {doc.user?.phone && (
                    <a
                      href={`tel:${doc.user.phone.split("/")[0].replace(/[^\d+]/g, "")}`}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold leading-relaxed text-slate-600 flex items-start gap-2 text-left hover:bg-slate-50 transition"
                    >
                      <Phone className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                      <span className="min-w-0 break-words">
                        {doc.user.phone}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. SAMU Social Banner */}
      <div className="bg-rose-50 border border-rose-200/70 rounded-3xl p-5 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
          <Phone className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-rose-950 uppercase tracking-tight">
            SAMU Social Gabonais - 1488
          </h4>
          <p className="text-xs text-rose-900/90 leading-relaxed">
            Consultations gratuites 7j/7 et 24h/24 : cardiologie, dentiste,
            ophtalmologie, gynécologie, ORL, kinésithérapie, psychologie,
            généraliste et sage-femme à domicile. Examens gratuits :
            radiographie, échographie pelvienne et ECG.
          </p>
          <a
            href="tel:1488"
            className="inline-flex items-center gap-1 text-xs font-black text-rose-700 pt-1"
          >
            Appeler le 1488 <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Modals */}
      <MedicationAvailabilityModal
        isOpen={isMedModalOpen}
        onClose={() => setIsMedModalOpen(false)}
        result={selectedMedResult}
        onReserve={(offer, medName) => {
          if (selectedMedResult) {
            setSelectedOfferForReserve({
              offer,
              medicationName: medName,
              medicationId: selectedMedResult.medication.id,
            });
          }
        }}
      />

      <DoctorBookingModal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        doctor={selectedDoctor}
        onSuccess={() => {
          loadData();
        }}
      />

      <ReservationModal
        isOpen={!!selectedOfferForReserve}
        onClose={() => setSelectedOfferForReserve(null)}
        offer={selectedOfferForReserve?.offer || null}
        medicationName={selectedOfferForReserve?.medicationName || ""}
        medicationId={selectedOfferForReserve?.medicationId}
      />
    </div>
  );
};
