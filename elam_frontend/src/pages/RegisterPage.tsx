import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Building2, HeartPulse, Hospital, Pill, Stethoscope, UserRound } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

type RegisterRole = Extract<UserRole, 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'CLINIC'>;

const defaultPosition = {
  city: 'Libreville',
  district: 'Akanda',
  latitude: 0.5182,
  longitude: 9.4215,
};

const roleOptions: Array<{ role: RegisterRole; label: string; description: string; icon: React.ElementType }> = [
  { role: 'PATIENT', label: 'Patient', description: 'Rendez-vous et réservations.', icon: UserRound },
  { role: 'DOCTOR', label: 'Médecin', description: 'Agenda et demandes patients.', icon: Stethoscope },
  { role: 'PHARMACY', label: 'Pharmacie', description: 'Stock, garde et réservations.', icon: Pill },
  { role: 'CLINIC', label: 'Clinique', description: 'Urgences et établissement.', icon: Hospital },
];

const workspaceFor = (role: RegisterRole) => {
  if (role === 'DOCTOR') return '/doctor/dashboard';
  if (role === 'PHARMACY') return '/pharmacy/dashboard';
  return '/my-appointments';
};

export const RegisterPage: React.FC = () => {
  const { registerPatient, registerProfessional } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterRole>('PATIENT');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    cnamgsNumber: '',
    specialty: '',
    cnomNumber: '',
    organizationName: '',
    licenseNumber: '',
    address: '',
    directPhone: '',
    services: '',
  });

  const selectedRole = useMemo(() => roleOptions.find((item) => item.role === role)!, [role]);

  const updateField = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const basePayload = {
    email: form.email.trim(),
    phone: form.phone.trim(),
    password: form.password,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    city: defaultPosition.city,
    district: defaultPosition.district,
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (role === 'PATIENT') {
        await registerPatient({
          ...basePayload,
          cnamgsNumber: form.cnamgsNumber.trim() || undefined,
        });
      } else if (role === 'DOCTOR') {
        await registerProfessional('DOCTOR', {
          ...basePayload,
          cnomNumber: form.cnomNumber.trim(),
          title: 'Dr.',
          specialty: form.specialty.trim(),
          consultationFee: 15000,
          acceptsCnamgs: true,
          acceptsTeleconsult: false,
          acceptsHomeVisit: false,
          address: form.address.trim(),
          latitude: defaultPosition.latitude,
          longitude: defaultPosition.longitude,
          positionConfirmed: false,
        });
      } else if (role === 'PHARMACY') {
        await registerProfessional('PHARMACY', {
          ...basePayload,
          name: form.organizationName.trim(),
          licenseNumber: form.licenseNumber.trim() || undefined,
          address: form.address.trim(),
          latitude: defaultPosition.latitude,
          longitude: defaultPosition.longitude,
          positionConfirmed: false,
          pharmacyPhone: form.directPhone.trim() || form.phone.trim(),
          openingHours: '08h00 - 20h00',
          isOnDuty: false,
          acceptsCnamgs: true,
        });
      } else {
        await registerProfessional('CLINIC', {
          ...basePayload,
          name: form.organizationName.trim(),
          type: 'CLINIC',
          address: form.address.trim(),
          latitude: defaultPosition.latitude,
          longitude: defaultPosition.longitude,
          positionConfirmed: false,
          clinicPhone: form.directPhone.trim() || form.phone.trim(),
          hasEmergency247: false,
          acceptsCnamgs: true,
          services: form.services
            .split(',')
            .map((service) => service.trim())
            .filter(Boolean),
        });
      }

      navigate(workspaceFor(role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Inscription impossible pour le moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">
              <HeartPulse className="h-3.5 w-3.5" />
              Nouveau compte ELAM
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Créer un compte</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Choisissez votre profil. Les comptes professionnels sont créés avec une vérification en attente.
            </p>
          </div>
          <Link to="/login" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
            J'ai déjà un compte
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            {roleOptions.map((item) => {
              const Icon = item.icon;
              const isSelected = item.role === role;

              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setRole(item.role)}
                  className={`tap-active flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-slate-900">{item.label}</span>
                    <span className="block text-xs font-semibold text-slate-500">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <selectedRole.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950">Profil {selectedRole.label}</h2>
                <p className="text-xs font-semibold text-slate-500">{selectedRole.description}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" value={form.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field label="Nom" value={form.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field label="Email" value={form.email} onChange={(value) => updateField('email', value)} type="email" required />
              <Field label="Téléphone" value={form.phone} onChange={(value) => updateField('phone', value)} placeholder="+241..." required />
              <Field label="Mot de passe" value={form.password} onChange={(value) => updateField('password', value)} type="password" required />

              {role === 'PATIENT' && (
                <Field label="Numéro CNAMGS" value={form.cnamgsNumber} onChange={(value) => updateField('cnamgsNumber', value)} placeholder="Optionnel" />
              )}

              {role === 'DOCTOR' && (
                <>
                  <Field label="Spécialité" value={form.specialty} onChange={(value) => updateField('specialty', value)} required />
                  <Field label="Numéro CNOM" value={form.cnomNumber} onChange={(value) => updateField('cnomNumber', value)} required />
                  <Field label="Adresse du cabinet" value={form.address} onChange={(value) => updateField('address', value)} className="sm:col-span-2" required />
                </>
              )}

              {role === 'PHARMACY' && (
                <>
                  <Field label="Nom de la pharmacie" value={form.organizationName} onChange={(value) => updateField('organizationName', value)} required />
                  <Field label="Numéro licence" value={form.licenseNumber} onChange={(value) => updateField('licenseNumber', value)} placeholder="Optionnel" />
                  <Field label="Téléphone officine" value={form.directPhone} onChange={(value) => updateField('directPhone', value)} required />
                  <Field label="Adresse" value={form.address} onChange={(value) => updateField('address', value)} required />
                </>
              )}

              {role === 'CLINIC' && (
                <>
                  <Field label="Nom établissement" value={form.organizationName} onChange={(value) => updateField('organizationName', value)} required />
                  <Field label="Téléphone établissement" value={form.directPhone} onChange={(value) => updateField('directPhone', value)} required />
                  <Field label="Adresse" value={form.address} onChange={(value) => updateField('address', value)} required />
                  <Field label="Services" value={form.services} onChange={(value) => updateField('services', value)} placeholder="Urgences, radiologie..." />
                </>
              )}
            </div>

            {role !== 'PATIENT' && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-xs font-semibold leading-5 text-amber-800">
                <Building2 className="mt-0.5 h-4 w-4 flex-none" />
                <span>Votre espace sera créé immédiatement, avec une validation professionnelle à finaliser par l'administration ELAM.</span>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="tap-active mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Création...' : 'Créer mon compte'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
      />
    </label>
  );
}
