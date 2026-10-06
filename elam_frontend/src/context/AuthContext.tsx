import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { realDoctors, realPharmacies } from '../data/realDirectory';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  isAuthLoading: boolean;
  userLocation: { lat: number; lng: number; label: string };
  login: (emailOrPhone: string, password: string) => Promise<User>;
  registerPatient: (data: Record<string, unknown>) => Promise<User>;
  registerProfessional: (role: 'DOCTOR' | 'PHARMACY' | 'CLINIC', data: Record<string, unknown>) => Promise<User>;
  switchDemoUser: (role: 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'ADMIN' | 'GUEST') => Promise<void>;
  logout: () => void;
  setUserLocation: (loc: { lat: number; lng: number; label: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Le mode demonstration est DESACTIVE par defaut : il faut l'activer
// explicitement avec VITE_DEMO_MODE=true. L'ancien test (`!== 'false'`)
// l'activait des que la variable etait absente — donc sur Vercel.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('elam_token'));
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  // Coordonnées par défaut : Libreville / Akanda
  const [userLocation, setUserLocation] = useState({
    lat: 0.5182,
    lng: 9.4215,
    label: 'Akanda, Libreville 🇬🇦',
  });

  const switchDemoUser = async (roleType: 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'ADMIN' | 'GUEST') => {
    if (roleType === 'GUEST') {
      setUser(null);
      setToken(null);
      api.setToken(null);
      return;
    }

    if (!DEMO_MODE) {
      throw new Error('Le mode démonstration est désactivé.');
    }

    let email = 'patient.hans@elam.ga';
    if (roleType === 'DOCTOR') email = 'dr.damas.aboghe@elam.ga';
    if (roleType === 'PHARMACY') email = 'contact@pharmacie-saint-antoine.ga';
    if (roleType === 'ADMIN') email = 'admin@elam.ga';

    try {
      const res = await api.login(email, 'Password123!');
      setUser(res.user);
      setToken(res.token);
    } catch (err) {
      console.warn('Backend login fallback:', err);
      if (!DEMO_MODE) throw err;
      // Fallback local mock user uniquement en mode démonstration.
      if (roleType === 'PATIENT') {
        setUser({
          id: 'demo-patient',
          email: 'patient.hans@elam.ga',
          phone: '+24107695040',
          firstName: 'Hans',
          lastName: 'Mba Ndong',
          role: 'PATIENT',
          patientProfile: {
            id: 'pat-1',
            userId: 'demo-patient',
            city: 'Libreville',
            district: 'Akanda',
            cnamgsNumber: 'GA-2024-98472-CNAMGS',
          },
        });
      } else if (roleType === 'DOCTOR') {
        setUser({
          id: 'demo-doctor',
          email: 'dr.damas.aboghe@elam.ga',
          phone: '+24177850041',
          firstName: 'Damas',
          lastName: 'Aboghe',
          role: 'DOCTOR',
          doctorProfile: { ...realDoctors[0], userId: 'demo-doctor' },
        });
      } else if (roleType === 'PHARMACY') {
        const demoPharmacy = realPharmacies[0];
        setUser({
          id: 'demo-pharmacy',
          email: 'contact@pharmacie-saint-antoine.ga',
          phone: '+24174335777',
          firstName: 'Directeur',
          lastName: 'Pharmacie Saint Antoine',
          role: 'PHARMACY',
          pharmacyProfile: { ...demoPharmacy, userId: 'demo-pharmacy' },
        });
      } else if (roleType === 'ADMIN') {
        setUser({
          id: 'demo-admin',
          email: 'admin@elam.ga',
          phone: '+24107000000',
          firstName: 'Administration',
          lastName: 'ELAM',
          role: 'ADMIN',
        });
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (!token) {
        setUser(null);
        if (!cancelled) setIsAuthLoading(false);
        return;
      }

      try {
        const currentUser = await api.getMe();
        if (!cancelled) setUser(currentUser);
      } catch {
        api.setToken(null);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (emailOrPhone: string, password: string) => {
    const res = await api.login(emailOrPhone, password);
    setUser(res.user);
    setToken(res.token);
    return res.user as User;
  };

  const registerPatient = async (data: Record<string, unknown>) => {
    const res = await api.registerPatient(data);
    setUser(res.user);
    setToken(res.token);
    return res.user as User;
  };

  const registerProfessional = async (roleType: 'DOCTOR' | 'PHARMACY' | 'CLINIC', data: Record<string, unknown>) => {
    const res =
      roleType === 'DOCTOR'
        ? await api.registerDoctor(data)
        : roleType === 'PHARMACY'
          ? await api.registerPharmacy(data)
          : await api.registerClinic(data);
    setUser(res.user);
    setToken(res.token);
    return res.user as User;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    api.setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'PATIENT',
        token,
        isAuthLoading,
        userLocation,
        login,
        registerPatient,
        registerProfessional,
        switchDemoUser,
        logout,
        setUserLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
