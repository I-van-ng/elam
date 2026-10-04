import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  isAuthLoading: boolean;
  userLocation: { lat: number; lng: number; label: string };
  switchDemoUser: (role: 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'GUEST') => Promise<void>;
  logout: () => void;
  setUserLocation: (loc: { lat: number; lng: number; label: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
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

  const switchDemoUser = async (roleType: 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'GUEST') => {
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
    if (roleType === 'DOCTOR') email = 'dr.minko@elam.ga';
    if (roleType === 'PHARMACY') email = 'contact@pharmacie-okala.ga';

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
          email: 'dr.minko@elam.ga',
          phone: '+24107112233',
          firstName: 'Alain',
          lastName: 'Minko',
          role: 'DOCTOR',
          doctorProfile: {
            id: 'doc-1',
            userId: 'demo-doctor',
            specialty: 'Cardiologie',
            consultationFee: 25000,
            acceptsCnamgs: true,
            acceptsTeleconsult: true,
            acceptsHomeVisit: false,
            address: 'Cabinet Médical du Littoral, Glass',
            city: 'Libreville',
            latitude: 0.3801,
            longitude: 9.4472,
            rating: 4.9,
            reviewCount: 42,
            verificationStatus: 'VERIFIED',
          },
        });
      } else if (roleType === 'PHARMACY') {
        setUser({
          id: 'demo-pharmacy',
          email: 'contact@pharmacie-okala.ga',
          phone: '+24111738290',
          firstName: 'Directeur',
          lastName: 'Pharmacie Okala',
          role: 'PHARMACY',
          pharmacyProfile: {
            id: 'pharm-1',
            userId: 'demo-pharmacy',
            name: 'Pharmacie d\'Okala',
            address: 'Route Nationale 1, face Station Shell Okala',
            city: 'Libreville',
            district: 'Akanda',
            latitude: 0.5182,
            longitude: 9.4215,
            phone: '+241 11 73 82 90',
            openingHours: '24h/24 (Semaine de Garde)',
            isOnDuty: true,
            acceptsCnamgs: true,
            rating: 4.8,
            reviewCount: 26,
            verificationStatus: 'VERIFIED',
          },
        });
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (!token) {
        // En mode démo uniquement, on connecte automatiquement en tant que patient
        if (DEMO_MODE) await switchDemoUser('PATIENT');
        else setUser(null); // Mode normal : pas de connexion automatique
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
