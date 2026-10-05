import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { PharmaciesPage } from './pages/PharmaciesPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { ClinicsPage, HospitalsPage } from './pages/ClinicsPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { PharmacyDashboardPage } from './pages/PharmacyDashboardPage';
import { PatientAppointmentsPage } from './pages/PatientAppointmentsPage';
import { PricingPage } from './pages/PricingPage';
import { DirectoryManagementPage } from './pages/DirectoryManagementPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserRole } from './types';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ role, children }: { role: UserRole; children: React.ReactElement }) {
  const { user, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-slate-500">Chargement de votre espace...</div>;
  }

  if (!user || user.role !== role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function App() {
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);
  const [isSiteLoading, setIsSiteLoading] = useState(true);

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => {
      setIsSiteLoading(false);
    }, 1800);

    return () => window.clearTimeout(loadingTimer);
  }, []);

  if (isSiteLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-emerald-400 to-teal-500 text-4xl font-black shadow-2xl shadow-emerald-500/25 animate-pulse">
            <HeartPulse className="h-11 w-11" strokeWidth={2.4} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">ELAM</h1>
          <p className="mt-2 text-sm font-medium text-slate-300">Chargement de votre santé connectée...</p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-300 elam-loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className={`min-h-screen bg-slate-100/70 text-slate-900 transition-colors ${isPhoneFrame ? 'py-6 sm:py-10 flex flex-col items-center justify-center' : ''}`}>
          {/* Main App Container */}
          <div
            className={`w-full transition-all duration-300 ${
              isPhoneFrame
                ? 'max-w-[430px] min-h-[860px] bg-slate-50 rounded-[44px] shadow-2xl shadow-slate-900/20 border-[8px] border-slate-900 overflow-hidden relative flex flex-col'
                : 'min-h-screen bg-slate-50 flex flex-col'
            }`}
          >
            {/* Phone Notch/Speaker Indicator if in Phone Frame */}
            {isPhoneFrame && (
              <div className="w-full bg-slate-900 h-6 flex items-center justify-center relative select-none">
                <div className="w-24 h-4 bg-black rounded-b-2xl absolute top-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-800 mr-2"></div>
                  <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
                </div>
              </div>
            )}

            <Navbar isPhoneFrame={isPhoneFrame} setIsPhoneFrame={setIsPhoneFrame} />

            <main className="flex-1 overflow-x-hidden pb-24">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/pharmacies" element={<PharmaciesPage />} />
                <Route path="/doctors" element={<DoctorsPage />} />
                <Route path="/hospitals" element={<HospitalsPage />} />
                <Route path="/clinics" element={<ClinicsPage />} />
                <Route path="/my-appointments" element={<ProtectedRoute role="PATIENT"><PatientAppointmentsPage /></ProtectedRoute>} />
                <Route path="/doctor/dashboard" element={<ProtectedRoute role="DOCTOR"><DoctorDashboardPage /></ProtectedRoute>} />
                <Route path="/pharmacy/dashboard" element={<ProtectedRoute role="PHARMACY"><PharmacyDashboardPage /></ProtectedRoute>} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/directory" element={<ProtectedRoute role="ADMIN"><DirectoryManagementPage /></ProtectedRoute>} />
              </Routes>
            </main>

            <BottomNav isPhoneFrame={isPhoneFrame} />
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
