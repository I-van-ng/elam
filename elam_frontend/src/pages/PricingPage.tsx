import React from 'react';
import { Check, ShieldCheck, Zap, Building2, Stethoscope, Pill, Briefcase } from 'lucide-react';

export const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5" /> Modèle Économique Équitable & Transparent
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Des formules conçues pour valoriser les professionnels de santé au Gabon
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            L'accès à l'information et la prise de rendez-vous restent <strong>100% gratuits pour tous les patients</strong>. Les professionnels et structures s'abonnent à des outils de gestion et d'acquisition performants.
          </p>
        </div>

        {/* 1. Patient & Médecins */}
        <div className="space-y-6">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" /> Formules Patients & Médecins Spécialistes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 1: Patient */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  Grand Public
                </span>
                <h3 className="text-2xl font-black text-slate-900">Patient</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">0</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA / mois</span>
                </div>
                <p className="text-xs text-slate-500">
                  Accès complet et illimité pour tous les résidents et assurés gabonais.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 pt-4 border-t border-slate-100">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Recherche de pharmacies & gardes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Disponibilité réelle des médicaments avec stock</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Prise de RDV en ligne avec les spécialistes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Orientation vers hôpitaux & urgences 24/7</span>
                  </li>
                </ul>
              </div>

              <div className="py-2.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center">
                Inclus par défaut
              </div>
            </div>

            {/* Tier 2: Médecin Basic */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                  Praticien Libéral
                </span>
                <h3 className="text-2xl font-black text-slate-900">Médecin Basic</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">5 000</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA / mois</span>
                </div>
                <p className="text-xs text-slate-500">
                  Présence officielle et agenda de consultation numérique.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 pt-4 border-t border-slate-100">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Profil vérifié à l'Ordre des Médecins (CNOM)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Visibilité dans les recherches par spécialité</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Agenda en ligne & prise de rendez-vous</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Gestion des créneaux horaires et disponibilités</span>
                  </li>
                </ul>
              </div>

              <button className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-sm">
                Souscrire Médecin Basic
              </button>
            </div>

            {/* Tier 3: Médecin PRO */}
            <div className="bg-gradient-to-b from-blue-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden border-2 border-blue-500">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md">
                Recommandé
              </div>

              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-300 bg-blue-800/60 px-3 py-1 rounded-full">
                  Praticien Expert
                </span>
                <h3 className="text-2xl font-black text-white">Médecin PRO</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">10 000</span>
                  <span className="text-blue-200 font-bold text-sm">FCFA / mois</span>
                </div>
                <p className="text-xs text-blue-200">
                  Tout le forfait Basic + téléconsultation sécurisée et acquisition de patients.
                </p>

                <ul className="space-y-3 text-xs text-blue-100 pt-4 border-t border-blue-800/80">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Module complet de Téléconsultation médicale</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Visibilité prioritaire en haut des recherches</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Badge officiel Médecin Partenaire Vérifié</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Rappels automatiques aux patients (SMS / WhatsApp)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Statistiques d'activité & acquisition patient</span>
                  </li>
                </ul>
              </div>

              <button className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30">
                Souscrire Médecin PRO (10 000 F)
              </button>
            </div>
          </div>
        </div>

        {/* 2. Pharmacies */}
        <div className="space-y-6 pt-6">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-600" /> Solutions pour Officines de Pharmacie
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pharmacie Basic */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  Officine Référencée
                </span>
                <h3 className="text-2xl font-black text-slate-900">Pharmacie BASIC</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">0</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA / mois</span>
                </div>
                <p className="text-xs text-slate-500">
                  Référencement standard de l'officine sur la carte du Gabon.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 pt-4 border-t border-slate-100">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Fiche officielle (adresse, téléphone, horaires)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Indication des semaines de garde</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Référencement sur la carte interactive</span>
                  </li>
                </ul>
              </div>

              <button className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                Inscription Gratuite
              </button>
            </div>

            {/* Pharmacie PRO */}
            <div className="bg-white rounded-3xl p-8 border-2 border-purple-500 shadow-md flex flex-col justify-between space-y-6 relative">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  Gestion des Stocks
                </span>
                <h3 className="text-2xl font-black text-slate-900">Pharmacie PRO</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-purple-700">15 000</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA / mois</span>
                </div>
                <p className="text-xs text-slate-500">
                  Outil numérique pour capter les recherches de médicaments des patients.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 pt-4 border-t border-slate-100">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Mise à jour en direct des stocks de médicaments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Réception des demandes de réservation d'ordonnances</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Badge Officine Vérifiée avec Fraîcheur des Stocks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Statistiques sur les médicaments les plus demandés</span>
                  </li>
                </ul>
              </div>

              <button className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md shadow-purple-600/25">
                Souscrire Pharmacie PRO (15 000 F)
              </button>
            </div>

            {/* Pharmacie Premium */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  Intégration Complète
                </span>
                <h3 className="text-2xl font-black text-slate-900">Pharmacie PREMIUM</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">30 000</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA / mois</span>
                </div>
                <p className="text-xs text-slate-500">
                  Pour les grandes officines avec connexion API de leur logiciel de stock.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 pt-4 border-t border-slate-100">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Tout le forfait Pharmacie PRO</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Comptes multiples pour préparateurs en pharmacie</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Connexion API automatique avec le logiciel d'officine</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>Support dédié et prioritaire 7j/7</span>
                  </li>
                </ul>
              </div>

              <button className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition">
                Souscrire Pharmacie Premium
              </button>
            </div>
          </div>
        </div>

        {/* 3. Cliniques & Entreprises */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Cabinets & Cliniques Médicales</h3>
                <p className="text-xs text-slate-500">25 000 à 50 000 FCFA / mois</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pour les structures regroupant plusieurs médecins et spécialités. Gestion centralisée des agendas, visibilité des urgences 24/7 et mise en avant des plateaux techniques (Laboratoire, Scanner, Maternité).
            </p>
            <button className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition">
              Contacter pour une Clinique
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Pack Santé Salariés Entreprises</h3>
                <p className="text-xs text-slate-500">100 000 à 500 000 FCFA / an</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Offrez à l'ensemble de vos collaborateurs un accès santé prioritaire, orientation médicale immédiate en cas de crise et suivi préventif pour réduire l'absentéisme en entreprise au Gabon.
            </p>
            <button className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm">
              Demander un devis Entreprise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
