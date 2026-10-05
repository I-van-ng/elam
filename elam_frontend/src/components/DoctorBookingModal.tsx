import React, { useState } from 'react';
import { X, Calendar, Clock, Stethoscope, Video, Home, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DoctorProfile } from '../types';
import { api } from '../services/api';

interface DoctorBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: DoctorProfile | null;
  onSuccess: () => void;
}

const getToday = () => new Date().toISOString().slice(0, 10);

export const DoctorBookingModal: React.FC<DoctorBookingModalProps> = ({
  isOpen,
  onClose,
  doctor,
  onSuccess,
}) => {
  const [appointmentDate, setAppointmentDate] = useState(getToday);
  const [selectedSlot, setSelectedSlot] = useState('09:30');
  const [type, setType] = useState<'IN_PERSON' | 'TELECONSULTATION' | 'HOME_VISIT'>('IN_PERSON');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !doctor) return null;

  const doctorName = doctor.user ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}` : (doctor.title || 'Dr.') + ' Médecin';

  const timeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      alert('Veuillez renseigner le motif de votre consultation');
      return;
    }
    if (appointmentDate < getToday()) {
      setErrorMessage('Veuillez choisir une date à venir.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await api.bookAppointment({
        doctorId: doctor.id,
        appointmentDate,
        startTime: selectedSlot,
        endTime: calculateEndTime(selectedSlot),
        type,
        reason,
      });

      setSuccessMessage(`Votre rendez-vous a bien été transmis au cabinet du ${doctorName}.`);
      setTimeout(() => {
        setSuccessMessage(null);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Impossible de transmettre le rendez-vous.');
    } finally {
      setLoading(false);
    }
  };

  function calculateEndTime(start: string) {
    const [h, m] = start.split(':').map(Number);
    const endMinutes = m + 30;
    const endHour = endMinutes >= 60 ? h + 1 : h;
    const finalM = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
    return `${endHour.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 font-bold text-lg">
              🩺
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">{doctorName}</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Vérifié ✓
                </span>
              </div>
              <p className="text-xs text-blue-700 font-semibold">{doctor.specialty}</p>
              <p className="text-xs text-slate-500 mt-0.5">{doctor.address}, {doctor.city}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {successMessage ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Rendez-vous Envoyé !</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
            {/* Type de Consultation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Type de Consultation
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType('IN_PERSON')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 ${
                    type === 'IN_PERSON'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold">Au Cabinet</span>
                </button>

                <button
                  type="button"
                  disabled={!doctor.acceptsTeleconsult}
                  onClick={() => setType('TELECONSULTATION')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 ${
                    type === 'TELECONSULTATION'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40'
                  }`}
                >
                  <Video className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold">Téléconsult.</span>
                </button>

                <button
                  type="button"
                  disabled={!doctor.acceptsHomeVisit}
                  onClick={() => setType('HOME_VISIT')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 ${
                    type === 'HOME_VISIT'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40'
                  }`}
                >
                  <Home className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold">À Domicile</span>
                </button>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date du Rendez-vous
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={appointmentDate}
                  min={getToday()}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Time Slot Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Créneau Horaire Disponible
              </label>
              <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedSlot === slot
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200/60'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Motif */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Motif de la Consultation
              </label>
              <input
                type="text"
                placeholder="Ex: Suivi tensionnel, fièvre persistante..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fee & Insurance Notice */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Tarif consultation :</span>
                <strong className="text-slate-900 ml-1 font-extrabold">{doctor.consultationFee.toLocaleString()} FCFA</strong>
              </div>
              <span className={`font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                doctor.acceptsCnamgs ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
              }`}>
                {doctor.acceptsCnamgs && <ShieldCheck className="w-3.5 h-3.5" />}
                {doctor.acceptsCnamgs ? 'CNAMGS Prise en charge' : 'Sans assurance'}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              {loading ? 'Validation en cours...' : 'Confirmer le Rendez-vous'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
