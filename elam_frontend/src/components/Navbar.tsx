import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, role, switchDemoUser, userLocation, setUserLocation } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';

  const locateUser = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude, label: 'Position actuelle' });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-slate-100/80 transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Logo & Slogan */}
        <Link to="/" className="flex items-center gap-2.5 tap-active">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/25">
            <HeartPulse className="h-5 w-5" strokeWidth={2.6} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">ELAM</span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                Santé 🇬🇦
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Le réflexe santé au Gabon</p>
          </div>
        </Link>

        {/* Center: Location Pill */}
        <button type="button" onClick={locateUser} disabled={isLocating} aria-label="Utiliser ma position" className="hidden sm:flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/60 disabled:opacity-60 transition px-3 py-1.5 rounded-full text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-700">{isLocating ? 'Localisation...' : userLocation.label}</span>
        </button>

        {/* Right: Demo Role Switcher */}
        <div className="flex items-center gap-2">
          {/* Quick Demo Switcher Pill */}
          {demoMode && <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="tap-active flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-2xl text-xs font-bold shadow-sm hover:bg-slate-800 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="capitalize">{role === 'PATIENT' ? 'Hans (Patient)' : role === 'DOCTOR' ? 'Dr. Minko' : role === 'ADMIN' ? 'Administration' : "Pharm. d'Okala"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Changer de profil démo
                </div>
                <button
                  onClick={() => {
                    switchDemoUser('PATIENT');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    role === 'PATIENT' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-bold">Hans Mba Ndong</p>
                    <p className="text-[10px] text-slate-400">Patient • Assuré CNAMGS</p>
                  </div>
                  {role === 'PATIENT' && <span className="text-emerald-600 font-bold">✓</span>}
                </button>

                <button
                  onClick={() => {
                    switchDemoUser('DOCTOR');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    role === 'DOCTOR' ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-bold">Dr. Alain Minko</p>
                    <p className="text-[10px] text-slate-400">Médecin Cardiologue • CNOM</p>
                  </div>
                  {role === 'DOCTOR' && <span className="text-blue-600 font-bold">✓</span>}
                </button>

                <button
                  onClick={() => {
                    switchDemoUser('PHARMACY');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    role === 'PHARMACY' ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-bold">Pharmacie d'Okala</p>
                    <p className="text-[10px] text-slate-400">Officine de Garde (Akanda)</p>
                  </div>
                  {role === 'PHARMACY' && <span className="text-purple-600 font-bold">✓</span>}
                </button>

                <button
                  onClick={() => {
                    switchDemoUser('ADMIN');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-bold">Administration ELAM</p>
                    <p className="text-[10px] text-slate-400">Référentiel santé</p>
                  </div>
                  {role === 'ADMIN' && <span className="text-slate-700 font-bold">✓</span>}
                </button>
              </div>
            )}
          </div>}
        </div>
      </div>
    </header>
  );
};
