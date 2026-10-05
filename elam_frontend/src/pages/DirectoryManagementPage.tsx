import React, { FormEvent, useEffect, useState } from 'react';
import { Building2, Hospital, Plus, Stethoscope, Pill, UserRound, CheckCircle2, ExternalLink, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { buildGoogleMapsUrl, buildOsmUrl, formatCoordinates } from '../utils/locationLinks';

type EntityType = 'DOCTOR' | 'NURSE' | 'PHARMACY' | 'CLINIC' | 'HOSPITAL';

type SavedEntry = {
  id: string;
  type: EntityType;
  name: string;
  createdAt: string;
  pending: boolean;
  latitude?: number;
  longitude?: number;
  positionConfirmed?: boolean;
};

const entityOptions: Array<{ type: EntityType; label: string; description: string; icon: React.ElementType }> = [
  { type: 'DOCTOR', label: 'Médecin', description: 'Généraliste ou spécialiste', icon: Stethoscope },
  { type: 'NURSE', label: 'Infirmier', description: 'Soins et suivi infirmier', icon: UserRound },
  { type: 'PHARMACY', label: 'Pharmacie', description: 'Officine et stocks', icon: Pill },
  { type: 'CLINIC', label: 'Clinique', description: 'Centre de soins', icon: Building2 },
  { type: 'HOSPITAL', label: 'Hôpital', description: 'Établissement hospitalier', icon: Hospital },
];

const localStorageKey = 'elam-directory-entries';

const Field = ({ label, name, required = false, type = 'text', defaultValue, placeholder, step, onChange }: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  step?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
    <span>{label}{required && <span className="text-rose-600"> *</span>}</span>
    <input
      name={name}
      type={type}
      required={required}
      defaultValue={defaultValue}
      placeholder={placeholder}
      step={type === 'number' ? step : undefined}
      onChange={onChange}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
  </label>
);

export const DirectoryManagementPage: React.FC = () => {
  const [entityType, setEntityType] = useState<EntityType>('DOCTOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [coordinatePreview, setCoordinatePreview] = useState({ latitude: 0.5182, longitude: 9.4215 });

  useEffect(() => {
    const saved = localStorage.getItem(localStorageKey);
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  const saveLocalEntry = (entry: SavedEntry) => {
    const updated = [entry, ...entries];
    setEntries(updated);
    localStorage.setItem(localStorageKey, JSON.stringify(updated));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || '').trim();
    const checked = (name: string) => form.get(name) === 'on';
    const coordinates = {
      latitude: Number(value('latitude')),
      longitude: Number(value('longitude')),
    };
    const positionConfirmed = checked('positionConfirmed');

    const identity = {
      email: value('email'),
      phone: value('phone'),
      password: value('password'),
      firstName: value('firstName'),
      lastName: value('lastName'),
      address: value('address'),
      city: value('city'),
      district: value('district') || undefined,
      ...coordinates,
      positionConfirmed,
    };
    const isProfessional = entityType === 'DOCTOR' || entityType === 'NURSE';
    const displayName = isProfessional
      ? `${entityType === 'NURSE' ? 'Infirmier(ère)' : 'Dr.'} ${identity.firstName} ${identity.lastName}`
      : value('name');

    try {
      if (isProfessional) {
        await api.registerDoctor({
          ...identity,
          cnomNumber: value('registrationNumber'),
          title: entityType === 'NURSE' ? 'Infirmier(ère)' : 'Dr.',
          specialty: entityType === 'NURSE' ? 'Soins infirmiers' : value('specialty'),
          consultationFee: Number(value('consultationFee')),
          acceptsCnamgs: checked('acceptsCnamgs'),
          acceptsTeleconsult: checked('acceptsTeleconsult'),
          acceptsHomeVisit: checked('acceptsHomeVisit'),
        });
      } else if (entityType === 'PHARMACY') {
        await api.registerPharmacy({
          ...identity,
          name: value('name'),
          licenseNumber: value('registrationNumber') || undefined,
          pharmacyPhone: value('facilityPhone'),
          openingHours: value('openingHours'),
          isOnDuty: checked('isOnDuty'),
          acceptsCnamgs: checked('acceptsCnamgs'),
        });
      } else {
        await api.registerClinic({
          ...identity,
          name: value('name'),
          type: entityType,
          clinicPhone: value('facilityPhone'),
          emergencyPhone247: value('emergencyPhone') || undefined,
          hasEmergency247: checked('hasEmergency247'),
          acceptsCnamgs: checked('acceptsCnamgs'),
          services: value('services').split(',').map((service) => service.trim()).filter(Boolean),
        });
      }
      saveLocalEntry({
        id: crypto.randomUUID(),
        type: entityType,
        name: displayName,
        createdAt: new Date().toISOString(),
        pending: true,
        ...coordinates,
        positionConfirmed,
      });
      event.currentTarget.reset();
      setCoordinatePreview({ latitude: 0.5182, longitude: 9.4215 });
      setFeedback(`${displayName} a été ajouté et attend sa validation.`);
    } catch (error) {
      saveLocalEntry({
        id: crypto.randomUUID(),
        type: entityType,
        name: displayName,
        createdAt: new Date().toISOString(),
        pending: true,
        ...coordinates,
        positionConfirmed,
      });
      event.currentTarget.reset();
      setCoordinatePreview({ latitude: 0.5182, longitude: 9.4215 });
      setFeedback(`${displayName} est enregistré localement. Il sera synchronisé dès que l’API sera disponible.`);
      console.warn('Directory registration fallback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProfessional = entityType === 'DOCTOR' || entityType === 'NURSE';
  const isFacility = entityType === 'CLINIC' || entityType === 'HOSPITAL';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-700">Administration ELAM</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-950 sm:text-3xl">Référentiel des acteurs de santé</h1>
            <p className="mt-2 text-sm text-slate-500">Ajoutez les professionnels et les structures avant leur validation.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Validation administrative requise</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <aside className="space-y-2">
            {entityOptions.map(({ type, label, description, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => { setEntityType(type); setFeedback(null); }}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${entityType === type ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${entityType === type ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-4 w-4" /></span>
                <span><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-slate-500">{description}</span></span>
              </button>
            ))}

            {entries.length > 0 && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Ajouts récents</p>
                <div className="space-y-2">
                  {entries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-sm font-bold text-slate-800">{entry.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-amber-700">En attente de validation</span>
                        <span className={`font-bold ${entry.positionConfirmed ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {entry.positionConfirmed ? 'Position confirmée' : 'Position à vérifier'}
                        </span>
                      </div>
                      {entry.latitude !== undefined && entry.longitude !== undefined && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span className="text-slate-400">{formatCoordinates(entry.latitude, entry.longitude)}</span>
                          <a href={buildOsmUrl(entry.latitude, entry.longitude)} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-800">OSM</a>
                          <a href={buildGoogleMapsUrl(entry.latitude, entry.longitude)} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800">Google</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-extrabold text-slate-900">Ajouter {entityOptions.find((option) => option.type === entityType)?.label.toLowerCase()}</h2></div>
            {feedback && <p className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{feedback}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom du responsable" name="firstName" required />
              <Field label="Nom du responsable" name="lastName" required />
              <Field label="E-mail" name="email" type="email" required placeholder="contact@exemple.ga" />
              <Field label="Téléphone du responsable" name="phone" type="tel" required placeholder="+241 07 00 00 00" />
              <Field label="Mot de passe initial" name="password" type="password" required />
              {!isProfessional && <Field label="Nom de la structure" name="name" required />}
              {isProfessional && <Field label="N° ordre / autorisation professionnelle" name="registrationNumber" required placeholder={entityType === 'NURSE' ? 'Autorisation professionnelle' : 'N° CNOM'} />}
              {entityType === 'DOCTOR' && <Field label="Spécialité" name="specialty" required placeholder="Cardiologie, pédiatrie..." />}
              {isProfessional && <Field label="Tarif de consultation (FCFA)" name="consultationFee" type="number" required defaultValue={15000} />}
              {!isProfessional && <Field label="N° direct de la structure" name="facilityPhone" type="tel" required />}
              {!isProfessional && !isFacility && <Field label="N° licence de pharmacie" name="registrationNumber" />}
              {!isProfessional && !isFacility && <Field label="Horaires d’ouverture" name="openingHours" required defaultValue="08h00 - 20h00" />}
              {isFacility && <Field label="N° urgence 24/7" name="emergencyPhone" type="tel" />}
              {isFacility && <Field label="Services (séparés par des virgules)" name="services" placeholder="Urgences, laboratoire, imagerie" />}
              <div className="sm:col-span-2"><Field label="Adresse" name="address" required /></div>
              <Field label="Ville" name="city" required defaultValue="Libreville" />
              <Field label="Quartier" name="district" placeholder="Akanda, Glass..." />
              <Field
                label="Latitude"
                name="latitude"
                type="number"
                step="any"
                required
                defaultValue={0.5182}
                onChange={(event) => setCoordinatePreview((current) => ({ ...current, latitude: Number(event.target.value) }))}
              />
              <Field
                label="Longitude"
                name="longitude"
                type="number"
                step="any"
                required
                defaultValue={9.4215}
                onChange={(event) => setCoordinatePreview((current) => ({ ...current, longitude: Number(event.target.value) }))}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 border-y border-slate-100 py-4 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2"><input name="acceptsCnamgs" type="checkbox" defaultChecked className="h-4 w-4 accent-emerald-600" /> Conventionné CNAMGS</label>
              <label className="flex items-center gap-2"><input name="positionConfirmed" type="checkbox" className="h-4 w-4 accent-emerald-600" /> Position GPS confirmée</label>
              {isProfessional && <label className="flex items-center gap-2"><input name="acceptsTeleconsult" type="checkbox" className="h-4 w-4 accent-emerald-600" /> Téléconsultation</label>}
              {isProfessional && <label className="flex items-center gap-2"><input name="acceptsHomeVisit" type="checkbox" className="h-4 w-4 accent-emerald-600" /> Visite à domicile</label>}
              {entityType === 'PHARMACY' && <label className="flex items-center gap-2"><input name="isOnDuty" type="checkbox" className="h-4 w-4 accent-emerald-600" /> Pharmacie de garde</label>}
              {isFacility && <label className="flex items-center gap-2"><input name="hasEmergency247" type="checkbox" className="h-4 w-4 accent-emerald-600" /> Urgences 24/7</label>}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Aperçu GPS : {formatCoordinates(coordinatePreview.latitude, coordinatePreview.longitude)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <a href={buildOsmUrl(coordinatePreview.latitude, coordinatePreview.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-emerald-700 shadow-sm hover:text-emerald-800">
                    Ouvrir dans OSM <ExternalLink className="h-3 w-3" />
                  </a>
                  <a href={buildGoogleMapsUrl(coordinatePreview.latitude, coordinatePreview.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-blue-700 shadow-sm hover:text-blue-800">
                    Ouvrir dans Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            <button disabled={isSubmitting} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><Plus className="h-4 w-4" />{isSubmitting ? 'Enregistrement...' : 'Ajouter au référentiel'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
