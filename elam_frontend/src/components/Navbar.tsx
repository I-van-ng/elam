import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  LogIn,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const workspacePath =
    user?.role === 'DOCTOR'
      ? '/doctor/dashboard'
      : user?.role === 'PHARMACY'
        ? '/pharmacy/dashboard'
        : user?.role === 'ADMIN'
          ? '/directory'
          : '/my-appointments';

  const handleLogout = () => {
    logout();
    navigate('/');
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

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to={workspacePath}
                className="hidden sm:flex tap-active items-center gap-2 rounded-2xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
              >
                <UserCircle className="h-4 w-4" />
                <span>{user.firstName || 'Mon espace'}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="tap-active inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-rose-600"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="tap-active inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <LogIn className="h-4 w-4" />
              <span>Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
