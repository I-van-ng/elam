import {
  DoctorProfile,
  PharmacyProfile,
  ClinicProfile,
  MedicationSearchResult,
  Appointment,
  MedicationReservation,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
  private token: string | null = localStorage.getItem('elam_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('elam_token', token);
    } else {
      localStorage.removeItem('elam_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      const json = contentType.includes('application/json') ? await response.json() : null;
      if (!response.ok) {
        throw new Error(json?.error || json?.message || `Erreur HTTP ${response.status}`);
      }
      return json?.data as T;
    } catch (error: any) {
      console.warn(`[ELAM API Error on ${endpoint}]:`, error.message);
      throw error;
    }
  }

  // Auth
  async login(emailOrPhone: string, pass: string) {
    const res = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password: pass }),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Waze Santé - Unified Search
  async searchNearby(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    query?: string;
    filter?: string;
  }) {
    const searchParams = new URLSearchParams({
      lat: params.lat.toString(),
      lng: params.lng.toString(),
      radiusKm: (params.radiusKm || 15).toString(),
      ...(params.query ? { query: params.query } : {}),
      ...(params.filter ? { filter: params.filter } : {}),
    });
    return this.request<any>(`/search/nearby?${searchParams.toString()}`);
  }

  // Pharmacies
  async listPharmacies(params?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    isOnDuty?: boolean;
    acceptsCnamgs?: boolean;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.lat !== undefined) searchParams.append('lat', params.lat.toString());
    if (params?.lng !== undefined) searchParams.append('lng', params.lng.toString());
    if (params?.radiusKm !== undefined) searchParams.append('radiusKm', params.radiusKm.toString());
    if (params?.isOnDuty !== undefined) searchParams.append('isOnDuty', params.isOnDuty.toString());
    if (params?.acceptsCnamgs !== undefined) searchParams.append('acceptsCnamgs', params.acceptsCnamgs.toString());
    if (params?.search) searchParams.append('search', params.search);

    return this.request<PharmacyProfile[]>(`/pharmacies?${searchParams.toString()}`);
  }

  async getPharmacy(id: string, lat?: number, lng?: number) {
    const q = lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : '';
    return this.request<PharmacyProfile>(`/pharmacies/${id}${q}`);
  }

  async searchMedicationAvailability(query: string, lat?: number, lng?: number) {
    const searchParams = new URLSearchParams({ q: query });
    if (lat !== undefined && lng !== undefined) {
      searchParams.append('lat', lat.toString());
      searchParams.append('lng', lng.toString());
    }
    return this.request<MedicationSearchResult[]>(`/pharmacies/medications/search?${searchParams.toString()}`);
  }

  async updateDutyStatus(isOnDuty: boolean) {
    return this.request<PharmacyProfile>('/pharmacies/duty-status', {
      method: 'PATCH',
      body: JSON.stringify({ isOnDuty }),
    });
  }

  async updateStock(medicationId: string, status: string, priceFcfa?: number, quantity?: number) {
    return this.request<any>('/pharmacies/stock', {
      method: 'PUT',
      body: JSON.stringify({ medicationId, status, priceFcfa, quantity }),
    });
  }

  async createReservation(data: { pharmacyId: string; medicationId: string; quantity: number; notes?: string }) {
    return this.request<any>('/pharmacies/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPharmacyReservations() {
    return this.request<MedicationReservation[]>('/pharmacies/reservations');
  }

  async updateReservationStatus(id: string, status: string) {
    return this.request<any>(`/pharmacies/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Doctors
  async listDoctors(params?: {
    specialty?: string;
    city?: string;
    acceptsCnamgs?: boolean;
    acceptsTeleconsult?: boolean;
    lat?: number;
    lng?: number;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.specialty) searchParams.append('specialty', params.specialty);
    if (params?.city) searchParams.append('city', params.city);
    if (params?.acceptsCnamgs !== undefined) searchParams.append('acceptsCnamgs', params.acceptsCnamgs.toString());
    if (params?.acceptsTeleconsult !== undefined) searchParams.append('acceptsTeleconsult', params.acceptsTeleconsult.toString());
    if (params?.lat !== undefined) searchParams.append('lat', params.lat.toString());
    if (params?.lng !== undefined) searchParams.append('lng', params.lng.toString());
    if (params?.search) searchParams.append('search', params.search);

    return this.request<DoctorProfile[]>(`/doctors?${searchParams.toString()}`);
  }

  async getDoctor(id: string, lat?: number, lng?: number) {
    const q = lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : '';
    return this.request<DoctorProfile>(`/doctors/${id}${q}`);
  }

  // Appointments
  async bookAppointment(data: {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    type: string;
    reason: string;
  }) {
    return this.request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDoctorAppointments(status?: string, date?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    return this.request<Appointment[]>(`/appointments/doctor?${params.toString()}`);
  }

  async getPatientAppointments() {
    return this.request<Appointment[]>('/appointments/patient');
  }

  async updateAppointmentStatus(id: string, status: string, doctorNotes?: string) {
    return this.request<Appointment>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, doctorNotes }),
    });
  }

  // Clinics
  async listClinics(params?: { hasEmergency247?: boolean; acceptsCnamgs?: boolean; lat?: number; lng?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.hasEmergency247 !== undefined) searchParams.append('hasEmergency247', params.hasEmergency247.toString());
    if (params?.acceptsCnamgs !== undefined) searchParams.append('acceptsCnamgs', params.acceptsCnamgs.toString());
    if (params?.lat !== undefined) searchParams.append('lat', params.lat.toString());
    if (params?.lng !== undefined) searchParams.append('lng', params.lng.toString());

    return this.request<ClinicProfile[]>(`/clinics?${searchParams.toString()}`);
  }

  // Subscriptions
  async getPlans() {
    return this.request<any[]>('/subscriptions/plans');
  }

  async initiatePayment(data: {
    amount: number;
    phone: string;
    operator: 'AIRTEL_MONEY' | 'MOOV_MONEY';
    relatedTo: 'APPOINTMENT' | 'RESERVATION' | 'SUBSCRIPTION';
    relatedId: string;
    applyCnamgs: boolean;
  }) {
    return this.request<any>('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
