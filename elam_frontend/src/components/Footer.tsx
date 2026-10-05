import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, HeartPulse, ShieldCheck, PhoneCall, Mail, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-lg">
                <HeartPulse className="h-[18px] w-[18px]" strokeWidth={2.6} />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">ELAM</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              *« Application Lumière »* (Langue Fang). Le premier réflexe santé au Gabon pour trouver des médicaments en temps réel, géolocaliser les pharmacies de garde et prendre rendez-vous avec un professionnel.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
              <ShieldCheck className="w-4 h-4" /> Conforme à la loi sur le système d'information de santé au Gabon
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Patients</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pharmacies" className="hover:text-emerald-400 transition">
                  Pharmacies de garde à Libreville
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-emerald-400 transition">
                  Rechercher la disponibilité d'un médicament
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-emerald-400 transition">
                  Prendre rendez-vous avec un médecin
                </Link>
              </li>
              <li>
                <Link to="/clinics" className="hover:text-emerald-400 transition">
                  Services d'urgences 24/7 et Hôpitaux
                </Link>
              </li>
              <li>
                <span className="text-emerald-400 font-semibold">100% Gratuit pour les patients</span>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Professionnels</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pricing" className="hover:text-emerald-400 transition">
                  Offres Médecins et Spécialistes (CNOM)
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-emerald-400 transition">
                  Solutions Officines et Gestion de Stock
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-emerald-400 transition">
                  Portail Cliniques et Établissements
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-emerald-400 transition">
                  Pack Santé Salariés Entreprises
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Assistance et Urgences</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" /> SAMU Social Gabonais : <strong className="text-white">1488</strong>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" /> Sapeurs-Pompiers : <strong className="text-white">18</strong>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> Contact : hansmbandong@gmail.com
              </li>
              <li className="pt-2">
                <a
                  href="https://ecnamgs.cnamgs.ga"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition"
                >
                  Portail CNAMGS Gabon <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 ELAM Health Gabon. Porteur du projet : Mba Ndong Hans.</p>
          <p className="flex items-center gap-1">
            Développé avec <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> pour le système de santé gabonais
          </p>
        </div>
      </div>
    </footer>
  );
};
