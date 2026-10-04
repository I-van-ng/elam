export type UserRole = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'CLINIC' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  patientProfile?: PatientProfile;
  doctorProfile?: DoctorProfile;
  pharmacyProfile?: PharmacyProfile;
  clinicProfile?: ClinicProfile;
}

export interface PatientProfile {
  id: string;
  userId: string;
  city?: string;
  district?: string;
  cnamgsNumber?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  cnomNumber?: string;
  title?: string;
  specialty: string;
  subSpecialties?: string;
  bio?: string;
  experienceYears?: number;
  consultationFee: number;
  acceptsCnamgs: boolean;
  acceptsTeleconsult: boolean;
  acceptsHomeVisit: boolean;
  address: string;
  city: string;
  district?: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  verificationStatus: string;
  distanceKm?: number;
  availabilities?: DoctorAvailability[];
  user?: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
  };
}

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isAvailable: boolean;
}

export interface PharmacyProfile {
  id: string;
  userId: string;
  name: string;
  licenseNumber?: string;
  address: string;
  city: string;
  district?: string;
  latitude: number;
  longitude: number;
  phone: string;
  emergencyPhone?: string;
  openingHours: string;
  isOnDuty: boolean;
  onDutyUntil?: string;
  acceptsCnamgs: boolean;
  rating: number;
  reviewCount: number;
  verificationStatus: string;
  distanceKm?: number;
  stocks?: PharmacyStock[];
}

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  category: string;
  form: string;
  dosage: string;
  requiresPrescription: boolean;
  codeCnamgs?: string;
  description?: string;
}

export interface PharmacyStock {
  id: string;
  pharmacyId: string;
  medicationId: string;
  medication: Medication;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNVERIFIED';
  quantity: number;
  priceFcfa: number;
  lastVerifiedAt: string;
}

export interface MedicationAvailabilityOffer {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  district?: string;
  city: string;
  phone: string;
  isOnDuty: boolean;
  acceptsCnamgs: boolean;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  priceFcfa: number;
  quantity: number;
  lastVerifiedAt: string;
  freshness: string;
  distanceKm?: number;
}

export interface MedicationSearchResult {
  medication: Medication;
  availablePharmaciesCount: number;
  offers: MedicationAvailabilityOffer[];
}

export interface ClinicProfile {
  id: string;
  userId: string;
  name: string;
  type: string;
  address: string;
  city: string;
  district?: string;
  latitude: number;
  longitude: number;
  phone: string;
  emergencyPhone247?: string;
  hasEmergency247: boolean;
  acceptsCnamgs: boolean;
  services?: string[] | string;
  distanceKm?: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  type: 'IN_PERSON' | 'TELECONSULTATION' | 'HOME_VISIT';
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  reason: string;
  patientNotes?: string;
  doctorNotes?: string;
  feeFcfa: number;
  isPaid: boolean;
  doctor?: DoctorProfile;
  patient?: {
    user: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
    };
  };
}

export interface MedicationReservation {
  id: string;
  patientId: string;
  pharmacyId: string;
  medicationId: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'READY' | 'COLLECTED' | 'CANCELLED';
  notes?: string;
  medication: Medication;
  patient?: {
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  pharmacy?: PharmacyProfile;
}
