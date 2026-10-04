import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Pill,
  Stethoscope,
  Building2,
  Hospital,
  Siren,
  CalendarCheck,
  ClipboardPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC<{ isPhoneFrame?: boolean }> = ({ isPhoneFrame = false }) => {
  const location = useLocation();
  const { role } = useAuth();

  const navItems = [
    { path: '/', label: 'Explorer', icon: Compass },
    { path: '/pharmacies', label: 'Pharmacies', icon: Pill },
    { path: '/doctors', label: 'Médecins', icon: Stethoscope },
    { path: '/hospitals', label: 'Hôpitaux', icon: Hospital },
    { path: '/clinics', label: 'Urgences', icon: Siren },
  ];

  if (role === 'ADMIN') {
    navItems.push({ path: '/directory', label: 'Gérer', icon: ClipboardPlus });
  } else if (role === 'DOCTOR') {
    navItems.push({ path: '/doctor/dashboard', label: 'Mon Agenda', icon: CalendarCheck });
  } else if (role === 'PHARMACY') {
    navItems.push({ path: '/pharmacy/dashboard', label: 'Mon Officine', icon: Pill });
  } else {
    navItems.push({ path: '/my-appointments', label: 'RDV', icon: CalendarCheck });
  }

  return (
    <div className={`${isPhoneFrame ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 z-50 flex justify-center pb-3 px-4 pointer-events-none`}>
      <nav className="pointer-events-auto max-w-lg w-full glass-nav border border-slate-200/80 shadow-2xl shadow-slate-900/10 rounded-3xl p-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`tap-active relative flex min-w-0 flex-1 flex-col items-center justify-center py-2 px-1.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-emerald-700 font-bold bg-emerald-50/90 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-emerald-600 stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-emerald-800' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-emerald-600 rounded-full"></span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
