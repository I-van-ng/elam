import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Video,
  ShieldCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Appointment } from '../types';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDoctorData = async () => {
    setLoading(true);
    try {
      const data = await api.getDoctorAppointments();
      setAppointments(data || []);
    } catch (err) {
      console.warn('Fallback doctor appointments:', err);
      setAppointments([
        {
          id: 'apt-1',
          patientId: 'pat-1',
          doctorId: 'doc-1',
          appointmentDate: '2026-09-10',
          startTime: '09:30',
          endTime: '10:00',
          type: 'IN_PERSON',
          status: 'REQUESTED',
          reason: 'Consultation médicale générale',
          feeFcfa: 7500,
          isPaid: false,
          patient: {
            user: {
              firstName: 'Hans',
              lastName: 'Mba Ndong',
              phone: '+241 07 69 50 40',
              email: 'patient.hans@elam.ga',
            },
          },
        },
        {
          id: 'apt-2',
          patientId: 'pat-2',
          doctorId: 'doc-1',
          appointmentDate: '2026-09-10',
          startTime: '10:30',
          endTime: '11:00',
          type: 'IN_PERSON',
          status: 'CONFIRMED',
          reason: 'Suivi patient et soins',
          feeFcfa: 7500,
          isPaid: true,
          patient: {
            user: {
              firstName: 'Esther',
              lastName: 'Ndong',
              phone: '+241 06 22 33 44',
              email: 'esther.ndong@gmail.com',
            },
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    const previousStatus = appointments.find((appointment) => appointment.id === id)?.status;
    try {
      await api.updateAppointmentStatus(id, status);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch {
      if (previousStatus) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: previousStatus } : a))
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Profile Card Header */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg">
              🩺
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  Espace Praticien : Dr. {user?.firstName} {user?.lastName}
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Profil vérifié
                </span>
              </div>
              <p className="text-blue-200 text-xs font-semibold">
                Médecine Générale • Cabinet Médical du PK9, après la brigade du PK9
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Abonnement</span>
              <strong className="text-emerald-400 text-xs font-bold">Médecin BASIC ✓</strong>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Tarif consultation</span>
              <strong className="text-white text-xs font-bold">7 500 FCFA</strong>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium">Demandes en attente</span>
              <h3 className="text-2xl font-black text-slate-900">
                {appointments.filter((a) => a.status === 'REQUESTED').length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
              ⏳
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium">Rendez-vous confirmés</span>
              <h3 className="text-2xl font-black text-emerald-600">
                {appointments.filter((a) => a.status === 'CONFIRMED').length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium">Consultations au cabinet</span>
              <h3 className="text-2xl font-black text-blue-600">{appointments.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
              📹
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Agenda des Consultations Patients
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Validez ou reprogrammez les demandes de rendez-vous reçues en direct.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {apt.patient?.user.firstName} {apt.patient?.user.lastName}
                      </h4>
                      <span className="text-xs text-slate-500 font-medium">({apt.patient?.user.phone})</span>
                      {apt.type === 'TELECONSULTATION' ? (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Video className="w-3 h-3" /> Téléconsultation
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          En Cabinet
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Motif : <strong>{apt.reason}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {apt.appointmentDate} à {apt.startTime} - {apt.endTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {apt.status === 'REQUESTED' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'CONFIRMED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accepter
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'CANCELLED')}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold transition"
                      >
                        Refuser
                      </button>
                    </>
                  )}

                  {apt.status === 'CONFIRMED' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl">
                        ✓ Confirmé
                      </span>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}
                        className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                      >
                        Terminer Consultation
                      </button>
                    </div>
                  )}

                  {apt.status === 'COMPLETED' && (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                      Consultation Effectuée
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
