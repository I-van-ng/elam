import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, HeartPulse, Lock, Mail } from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';

const getWorkspacePath = (user: User) => {
  if (user.role === 'DOCTOR') return '/doctor/dashboard';
  if (user.role === 'PHARMACY') return '/pharmacy/dashboard';
  if (user.role === 'ADMIN') return '/directory';
  return '/my-appointments';
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(emailOrPhone.trim(), password);
      navigate(from || getWorkspacePath(user), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Connexion impossible pour le moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <HeartPulse className="h-3.5 w-3.5" />
            Espace sécurisé ELAM
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Connexion</h1>
            <p className="mt-3 max-w-md text-sm font-medium leading-6 text-slate-600">
              Accédez à vos rendez-vous, votre agenda médecin ou votre espace pharmacie avec votre email ou numéro de téléphone.
            </p>
          </div>
          <div className="grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">Patients : rendez-vous et réservations.</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">Pros : tableau de bord métier.</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Email ou téléphone</span>
              <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 focus-within:border-emerald-400 focus-within:bg-white">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  value={emailOrPhone}
                  onChange={(event) => setEmailOrPhone(event.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="patient@elam.ga ou +241..."
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Mot de passe</span>
              <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 focus-within:border-emerald-400 focus-within:bg-white">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Votre mot de passe"
                  required
                />
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-2xl bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="tap-active inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-center text-sm font-semibold text-slate-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-emerald-700 hover:text-emerald-800">
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
};
