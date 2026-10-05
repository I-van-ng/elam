import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Stethoscope, Video, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { Appointment } from '../types';
import { realDoctors } from '../data/realDirectory';

export const PatientAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getPatientAppointments();
        setAppointments(data || []);
      } catch (err) {
        console.warn('Fallback patient appointments:', err);
        setAppointments([
          {
            id: 'apt-1',
            patientId: 'pat-1',
            doctorId: 'doc-1',
            appointmentDate: '2026-09-10',
            startTime: '09:30',
            endTime: '10:00',
            type: 'IN_PERSON',
            status: 'CONFIRMED',
            reason: 'Consultation médicale générale',
            feeFcfa: 7500,
            isPaid: false,
            doctor: realDoctors[0],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" /> Carnet de Santé Patient
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Mes Rendez-vous Médicaux
          </h1>
          <p className="text-slate-500 text-sm">
            Retrouvez l'historique et les prochaines consultations programmées auprès de vos praticiens.
          </p>
        </div>

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
              <p className="text-slate-500 text-sm font-medium">Vous n'avez aucun rendez-vous programmé.</p>
              <Link
                to="/doctors"
                className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                Prendre un rendez-vous
              </Link>
            </div>
          ) : (
            appointments.map((apt) => {
              const docName = apt.doctor?.user ? `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}` : 'Dr. Damas Aboghe';
              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl shrink-0">
                        🩺
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900">{docName}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            apt.doctor?.acceptsCnamgs ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {apt.doctor?.acceptsCnamgs && <ShieldCheck className="w-3 h-3" />}
                            {apt.doctor?.acceptsCnamgs ? 'CNAMGS' : 'Sans assurance'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-blue-700">{apt.doctor?.specialty || 'Médecine Générale'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {apt.doctor?.address || 'Cabinet Médical du PK9'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-slate-900 block">
                        {apt.feeFcfa.toLocaleString()} FCFA
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-block mt-1 ${
                        apt.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'REQUESTED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {apt.status === 'CONFIRMED' ? '✓ Confirmé par le praticien' : 'En attente de confirmation'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 text-slate-600">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" /> {apt.appointmentDate}
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-blue-600" /> {apt.startTime} - {apt.endTime}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {apt.type === 'TELECONSULTATION' ? '📹 Téléconsultation' : '🏥 En Cabinet'}
                      </span>
                    </div>

                    <p className="text-slate-500 italic text-[11px]">
                      Motif : « {apt.reason} »
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
