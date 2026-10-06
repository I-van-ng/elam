import os
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from data.database import SessionLocal
from data.models import (
    PharmacyProfile,
    DoctorProfile,
    ClinicProfile,
    Medication,
    PharmacyStock,
    Appointment,
    MedicationReservation,
    Payment,
    User,
    PatientProfile,
)
from utils.geo import calculate_distance_km, format_travel_info


def normalize_gabon_phone(phone: str) -> str:
    cleaned = "".join(filter(str.isdigit, phone or ""))
    if cleaned.startswith("241"):
        cleaned = cleaned[3:]
    if cleaned.startswith("0"):
        cleaned = cleaned[1:]
    return cleaned


def detect_mobile_money_operator(phone: str):
    local = normalize_gabon_phone(phone)
    if local.startswith(("74", "76", "77", "11")):
        return "AIRTEL_MONEY"
    if local.startswith(("62", "65", "66")):
        return "MOOV_MONEY"
    return None


class ElamApiError(Exception):
    """Erreur remontee par l'API ELAM (message du backend, ou panne reseau)."""

    def __init__(self, message: str, status: int = None):
        super().__init__(message)
        self.message = message
        self.status = status


# Fichier de session : equivalent du localStorage du site web (cle 'elam_token')
SESSION_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".elam_session.json"
)


class ElamApiClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.environ.get("ELAM_API_URL", "http://localhost:5000/api/v1")
        self.health_url = os.environ.get("ELAM_HEALTH_URL", "http://localhost:5000/health")
        self._last_health_check_time = 0
        self._is_online = False
        # Coupe-circuit : apres un echec de connexion, on n'essaie plus pendant
        # quelques secondes. Sans cela, chaque appel repayait le delai complet et
        # un ecran faisant 3 appels figeait l'application plusieurs secondes.
        self._offline_until = 0.0
        # Profil connecte, comme AuthContext.user cote site web
        self.current_user = None
        self.auth_token = self._load_token()

    # --- Session persistante (le site utilise localStorage) ---
    def _load_token(self):
        try:
            with open(SESSION_FILE, "r", encoding="utf-8") as fh:
                return json.load(fh).get("token")
        except Exception:
            return None

    def _save_token(self, token):
        try:
            with open(SESSION_FILE, "w", encoding="utf-8") as fh:
                json.dump({"token": token}, fh)
        except Exception:
            pass

    def set_token(self, token):
        """Equivalent de api.setToken() cote site web."""
        self.auth_token = token
        if token:
            self._save_token(token)
        else:
            try:
                os.remove(SESSION_FILE)
            except Exception:
                pass

    @property
    def is_authenticated(self) -> bool:
        return bool(self.auth_token)

    @property
    def last_known_online(self) -> bool:
        """Dernier etat connu, SANS appel reseau.

        A utiliser dans les vues : interroger le serveur a chaque affichage
        bloquait l'interface (voir le coupe-circuit).
        """
        if time.time() < self._offline_until:
            return False
        return self._is_online

    def warm_up(self) -> bool:
        """Paie le cout du premier appel reseau pendant l'ecran de chargement.

        Sous Windows, la toute premiere connexion d'un processus peut couter
        1 a 2 secondes (inspection pare-feu/antivirus). En la declenchant au
        demarrage, dans un thread, l'utilisateur ne la subit jamais.
        """
        try:
            return self.is_online(force_refresh=True)
        except Exception:
            return False

    @property
    def role(self) -> str:
        """Role de l'utilisateur connecte (le site expose AuthContext.role)."""
        if self.current_user:
            return self.current_user.get("role") or "GUEST"
        return "GUEST"

    @property
    def full_name(self) -> str:
        user = self.current_user or {}
        return f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()

    @property
    def patient_profile(self):
        """Profil patient de l'utilisateur connecte (ou None)."""
        return (self.current_user or {}).get("patientProfile")

    @property
    def doctor_profile(self):
        """Profil medecin de l'utilisateur connecte (ou None)."""
        return (self.current_user or {}).get("doctorProfile")

    @property
    def pharmacy_profile(self):
        """Profil pharmacie de l'utilisateur connecte (ou None)."""
        return (self.current_user or {}).get("pharmacyProfile")

    @property
    def clinic_profile(self):
        """Profil etablissement de l'utilisateur connecte (ou None)."""
        return (self.current_user or {}).get("clinicProfile")


    def is_online(self, force_refresh: bool = False) -> bool:
        now = time.time()
        if not force_refresh and (now - self._last_health_check_time < 5.0):
            return self._is_online

        self._last_health_check_time = now
        try:
            req = urllib.request.Request(self.health_url, headers={"User-Agent": "ELAM-Mobile/1.0"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    self._is_online = True
                    return True
        except Exception:
            pass

        self._is_online = False
        return False

    def _http_request(
        self,
        endpoint: str,
        method: str = "GET",
        payload: dict = None,
        query_params: dict = None,
        timeout: float = 4.0,
    ) -> dict:
        """Appel HTTP brut. Leve ElamApiError avec le message du backend si echec."""
        # Coupe-circuit : le backend vient d'echouer, on ne repaie pas le delai.
        if time.time() < self._offline_until:
            raise ElamApiError(
                f"Serveur ELAM injoignable ({self.base_url}). Verifiez que le backend tourne."
            )

        url = f"{self.base_url}{endpoint}"
        if query_params:
            filtered_params = {k: str(v) for k, v in query_params.items() if v is not None}
            if filtered_params:
                url += "?" + urllib.parse.urlencode(filtered_params)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "ELAM-Mobile-Python/1.0",
        }
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        if payload is not None:
            # Le site fait JSON.stringify, qui omet les cles undefined. On omet donc
            # les valeurs None : les schemas Zod du backend declarent ces champs
            # `.optional()` (donc absents), et un null explicite est rejete en 422.
            clean_payload = {k: v for k, v in payload.items() if v is not None}
            data = json.dumps(clean_payload).encode("utf-8")
        else:
            data = None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as exc:
            # Le backend renvoie {success:false, error:"..."} — on remonte ce message
            detail = None
            try:
                parsed = json.loads(exc.read().decode("utf-8"))
                detail = parsed.get("error") or parsed.get("message")
            except Exception:
                detail = None
            if exc.code == 401:
                detail = detail or "Session expiree, veuillez vous reconnecter."
            raise ElamApiError(detail or f"Erreur serveur ELAM (HTTP {exc.code})", exc.code) from exc
        except urllib.error.URLError as exc:
            # Echec de connexion : on arme le coupe-circuit pour ne pas figer
            # l'interface a chaque appel suivant.
            self._offline_until = time.time() + 5.0
            self._is_online = False
            raise ElamApiError(
                f"Serveur ELAM injoignable ({self.base_url}). Verifiez que le backend tourne "
                f"et que ELAM_API_URL pointe vers la bonne adresse."
            ) from exc
        except json.JSONDecodeError as exc:
            raise ElamApiError("Reponse illisible du serveur ELAM.") from exc


    # 1. SEARCH / WAZE DE LA SANTE
    def search_nearby(self, lat: float, lng: float, radius_km: float = 20.0, query: str = "") -> dict:
        if self.is_online():
            try:
                res = self._http_request(
                    "/search/nearby",
                    query_params={"lat": lat, "lng": lng, "radiusKm": radius_km, "query": query},
                )
                if res.get("success") and "data" in res:
                    return {
                        "source": "API_CENTRAL",
                        "data": res["data"].get("results", res["data"]),
                    }
            except Exception as e:
                print(f"[API_CLIENT] Fallback local search_nearby: {e}")

        # Local SQLite Fallback
        db = SessionLocal()
        try:
            pharmacies = db.query(PharmacyProfile).all()
            doctors = db.query(DoctorProfile).all()
            clinics = db.query(ClinicProfile).all()

            matched_pharmacies = []
            for p in pharmacies:
                dist = calculate_distance_km(lat, lng, p.latitude, p.longitude)
                if dist <= radius_km:
                    matched_pharmacies.append({
                        "id": p.id,
                        "name": p.name,
                        "district": p.district,
                        "isOnDuty": p.is_on_duty,
                        "acceptsCnamgs": p.accepts_cnamgs,
                        "phone": p.phone,
                        "distanceKm": dist,
                        "travelTime": format_travel_info(dist),
                    })

            matched_doctors = []
            for d in doctors:
                dist = calculate_distance_km(lat, lng, d.latitude, d.longitude)
                if dist <= radius_km:
                    d_name = f"{d.title} {d.user.first_name} {d.user.last_name}" if (d.user) else "Dr. Spécialiste"
                    matched_doctors.append({
                        "id": d.id,
                        "name": d_name,
                        "specialty": d.specialty,
                        "district": d.district,
                        "consultationFee": d.consultation_fee,
                        "acceptsCnamgs": d.accepts_cnamgs,
                        "acceptsTeleconsult": d.accepts_teleconsult,
                        "distanceKm": dist,
                        "travelTime": format_travel_info(dist),
                    })

            return {
                "source": "LOCAL_SQLITE",
                "data": {
                    "pharmacies": matched_pharmacies,
                    "doctors": matched_doctors,
                    "clinics": clinics,
                },
            }
        finally:
            db.close()

    # 2. PHARMACIES
    def add_pharmacy(self, data: dict) -> PharmacyProfile:
        db = SessionLocal()
        try:
            user = User(
                email=data["email"],
                phone=data["phone"],
                first_name=data.get("manager_first_name") or "Direction",
                last_name=data["name"],
                role="PHARMACY",
            )
            db.add(user)
            db.flush()

            pharmacy = PharmacyProfile(
                user_id=user.id,
                name=data["name"],
                license_number=data.get("license_number"),
                address=data["address"],
                city=data.get("city") or "Libreville",
                district=data.get("district") or "Centre-ville",
                latitude=float(data.get("latitude") or 0.5182),
                longitude=float(data.get("longitude") or 9.4215),
                phone=data["phone"],
                opening_hours=data.get("opening_hours") or "08h00 - 20h00",
                is_on_duty=bool(data.get("is_on_duty")),
                accepts_cnamgs=bool(data.get("accepts_cnamgs", True)),
            )
            db.add(pharmacy)
            db.commit()
            db.refresh(pharmacy)
            return pharmacy
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get_pharmacies(
        self,
        duty_only: bool = False,
        cnamgs_only: bool = False,
        search: str = None,
        lat: float = None,
        lng: float = None,
        radius_km: float = None,
    ) -> list:
        """GET /pharmacies (source unique de verite : l'API).

        Leve ElamApiError si le backend est injoignable : on n'affiche jamais de
        donnees fictives (contrairement au repli du site web).
        """
        res = self._http_request(
            "/pharmacies",
            query_params={
                "isOnDuty": "true" if duty_only else None,
                "acceptsCnamgs": "true" if cnamgs_only else None,
                "search": search,
                "lat": lat,
                "lng": lng,
                "radiusKm": radius_km,
            },
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Liste des pharmacies indisponible.")
        return res.get("data") or []

    # 3. DOCTORS
    def add_doctor(self, data: dict) -> DoctorProfile:
        db = SessionLocal()
        try:
            user = User(
                email=data["email"],
                phone=data["phone"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                role="DOCTOR",
            )
            db.add(user)
            db.flush()

            doctor = DoctorProfile(
                user_id=user.id,
                cnom_number=data.get("cnom_number"),
                title=data.get("title") or "Dr.",
                specialty=data["specialty"],
                sub_specialties=data.get("sub_specialties"),
                bio=data.get("bio"),
                consultation_fee=int(data.get("consultation_fee") or 15000),
                accepts_cnamgs=bool(data.get("accepts_cnamgs", True)),
                accepts_teleconsult=bool(data.get("accepts_teleconsult")),
                accepts_home_visit=bool(data.get("accepts_home_visit")),
                address=data["address"],
                city=data.get("city") or "Libreville",
                district=data.get("district") or "Centre-ville",
                latitude=float(data.get("latitude") or 0.391),
                longitude=float(data.get("longitude") or 9.449),
                is_verified=True,
            )
            db.add(doctor)
            db.commit()
            db.refresh(doctor)
            return doctor
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get_doctors(
        self,
        specialty: str = None,
        cnamgs_only: bool = False,
        teleconsult_only: bool = False,
        search: str = None,
        lat: float = None,
        lng: float = None,
        radius_km: float = None,
    ) -> list:
        """GET /doctors (source unique de verite : l'API)."""
        res = self._http_request(
            "/doctors",
            query_params={
                "specialty": specialty if specialty and specialty != "ALL" else None,
                "acceptsCnamgs": "true" if cnamgs_only else None,
                "acceptsTeleconsult": "true" if teleconsult_only else None,
                "search": search,
                "lat": lat,
                "lng": lng,
                "radiusKm": radius_km,
            },
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Liste des medecins indisponible.")
        return res.get("data") or []

    # 4. CLINICS & URGENCE
    def add_clinic(self, data: dict) -> ClinicProfile:
        db = SessionLocal()
        try:
            clinic = ClinicProfile(
                name=data["name"],
                type=data.get("type") or "CLINIC",
                address=data["address"],
                city=data.get("city") or "Libreville",
                district=data.get("district") or "Centre-ville",
                latitude=float(data.get("latitude") or 0.391),
                longitude=float(data.get("longitude") or 9.449),
                phone=data["phone"],
                emergency_phone=data.get("emergency_phone") or "1300",
                has_emergency_247=bool(data.get("has_emergency_247", True)),
                accepts_cnamgs=bool(data.get("accepts_cnamgs", True)),
                services_list=data.get("services_list") or "Urgences, Médecine générale",
            )
            db.add(clinic)
            db.commit()
            db.refresh(clinic)
            return clinic
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get_clinics(
        self,
        has_emergency_247: bool = None,
        cnamgs_only: bool = False,
        lat: float = None,
        lng: float = None,
    ) -> list:
        """GET /clinics (source unique de verite : l'API)."""
        res = self._http_request(
            "/clinics",
            query_params={
                "hasEmergency247": "true" if has_emergency_247 else None,
                "acceptsCnamgs": "true" if cnamgs_only else None,
                "lat": lat,
                "lng": lng,
            },
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Liste des etablissements indisponible.")
        return res.get("data") or []

    # 5. APPOINTMENTS
    def get_my_appointments(self) -> list:
        """Identique a GET /appointments/patient (PatientAppointmentsPage du site)."""
        if self.is_authenticated and self.is_online():
            res = self._http_request("/appointments/patient")
            if res.get("success"):
                return res.get("data") or []

        db = SessionLocal()
        try:
            return db.query(Appointment).all()
        finally:
            db.close()

    def get_doctor_appointments(self, status: str = None, date: str = None) -> list:
        """Identique a GET /appointments/doctor (DoctorDashboardPage du site)."""
        res = self._http_request(
            "/appointments/doctor", query_params={"status": status, "date": date}
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Agenda indisponible.")
        return res.get("data") or []

    def book_appointment(
        self,
        doctor_id: str,
        appointment_date: str,
        start_time: str,
        end_time: str,
        appointment_type: str = "IN_PERSON",
        reason: str = "",
        patient_notes: str = None,
    ) -> dict:
        """Identique a POST /appointments (DoctorBookingModal du site).

        appointment_date : 'AAAA-MM-JJ' ; start_time / end_time : 'HH:MM'.
        appointment_type : IN_PERSON | TELECONSULTATION | HOME_VISIT.
        """
        res = self._http_request(
            "/appointments",
            method="POST",
            payload={
                "doctorId": doctor_id,
                "appointmentDate": appointment_date,
                "startTime": start_time,
                "endTime": end_time,
                "type": appointment_type,
                "reason": reason or "Consultation generale",
                "patientNotes": patient_notes,
            },
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Prise de rendez-vous impossible.")
        return res.get("data") or {}

    def update_appointment_status(self, appointment_id: str, status: str, doctor_notes: str = None) -> dict:
        """Identique a PATCH /appointments/:id/status."""
        res = self._http_request(
            f"/appointments/{appointment_id}/status",
            method="PATCH",
            payload={"status": status, "doctorNotes": doctor_notes},
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Mise a jour du rendez-vous impossible.")
        return res.get("data") or {}

    # 6. PAIEMENTS MOBILE MONEY (Airtel Money / Moov Money)
    def initiate_payment(self, related_to: str, related_id: str, phone: str, operator: str) -> dict:
        """Demarre un encaissement Mobile Money.

        Le MONTANT et la prise en charge CNAMGS sont calcules par le SERVEUR :
        ils ne sont plus transmis. Et surtout, AUCUN repli local : un paiement
        passe par l'operateur ou echoue. Il n'est jamais fabrique sur l'appareil.
        """
        if related_to not in ("APPOINTMENT", "RESERVATION", "SUBSCRIPTION"):
            raise ValueError("Type de paiement non pris en charge.")
        if not related_id:
            raise ValueError("Reference du service a payer manquante.")

        detected_operator = detect_mobile_money_operator(phone)
        if not detected_operator:
            raise ValueError(
                "Numero Mobile Money gabonais invalide. Airtel: 074/076/077/011, Moov: 062/065/066."
            )
        if operator not in ("AIRTEL_MONEY", "MOOV_MONEY"):
            raise ValueError("Operateur Mobile Money non pris en charge.")
        if operator != detected_operator:
            op_name = "Airtel Money" if detected_operator == "AIRTEL_MONEY" else "Moov Money"
            raise ValueError(f"Le numero renseigne correspond a {op_name}.")

        res = self._http_request(
            "/payments/initiate",
            method="POST",
            payload={
                "relatedTo": related_to,
                "relatedId": related_id,
                "phone": phone,
                "operator": operator,
            },
            timeout=25.0,  # l'operateur peut mettre plusieurs secondes a repondre
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "La demande de paiement a ete refusee.")
        return res.get("data") or {}

    def get_payment_status(self, transaction_ref: str) -> dict:
        """GET /payments/verify/:ref — interroge l'operateur. Sert au suivi du paiement."""
        ref = urllib.parse.quote(transaction_ref)
        res = self._http_request(f"/payments/verify/{ref}", timeout=25.0)
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Etat du paiement indisponible.")
        return res.get("data") or {}

    def get_payment_history(self) -> list:
        """GET /payments/history — uniquement les paiements de l'utilisateur connecte."""
        res = self._http_request("/payments/history")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Historique des paiements indisponible.")
        return res.get("data") or []


    # 7. AUTHENTIFICATION (equivalent de AuthContext.tsx cote site web)
    def login(self, email_or_phone: str, password: str) -> dict:
        """POST /auth/login — stocke le token et le profil, comme le site."""
        res = self._http_request(
            "/auth/login",
            method="POST",
            payload={"emailOrPhone": email_or_phone, "password": password},
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Identifiants incorrects.")
        data = res.get("data") or {}
        self.set_token(data.get("token"))
        self.current_user = data.get("user")
        return data

    def get_me(self) -> dict:
        """GET /auth/me — restaure la session au demarrage (comme le site au chargement)."""
        res = self._http_request("/auth/me")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Session invalide.")
        self.current_user = res.get("data")
        return self.current_user

    def restore_session(self):
        """Reprend la session enregistree. Renvoie le profil, ou None si non connecte."""
        if not self.auth_token:
            return None
        try:
            return self.get_me()
        except ElamApiError:
            self.logout()
            return None

    def logout(self):
        """Equivalent de AuthContext.logout() cote site."""
        self.current_user = None
        self.set_token(None)

    def register_patient(self, data: dict) -> dict:
        """POST /auth/register/patient — le site expose l'inscription praticiens, pas patient."""
        res = self._http_request("/auth/register/patient", method="POST", payload=data)
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Inscription impossible.")
        payload = res.get("data") or {}
        self.set_token(payload.get("token"))
        self.current_user = payload.get("user")
        return payload

    # 8. MEDICAMENTS & RESERVATIONS
    def search_medication_availability(
        self, query: str, lat: float = None, lng: float = None, in_stock_only: bool = False
    ) -> list:
        """GET /pharmacies/medications/search (MedicationAvailabilityModal du site)."""
        res = self._http_request(
            "/pharmacies/medications/search",
            query_params={
                "q": query,
                "lat": lat,
                "lng": lng,
                "inStockOnly": "true" if in_stock_only else None,
            },
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Recherche de medicament impossible.")
        return res.get("data") or []

    def list_medications(self) -> list:
        """GET /pharmacies/medications/search sans 'q' : catalogue general.

        Attention : des qu'on passe 'q', le backend change de forme de reponse
        (resultats de disponibilite au lieu du catalogue).
        """
        res = self._http_request("/pharmacies/medications/search")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Catalogue de medicaments indisponible.")
        return res.get("data") or []

    def create_reservation(
        self, pharmacy_id: str, medication_id: str, quantity: int = 1, notes: str = None
    ) -> dict:
        """POST /pharmacies/reservations (ReservationModal du site) — role PATIENT requis."""
        res = self._http_request(
            "/pharmacies/reservations",
            method="POST",
            payload={
                "pharmacyId": pharmacy_id,
                "medicationId": medication_id,
                "quantity": quantity,
                "notes": notes,
            },
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Reservation impossible.")
        return res.get("data") or {}

    def get_pharmacy_reservations(self) -> list:
        """GET /pharmacies/reservations (PharmacyDashboardPage du site) — role PHARMACY."""
        res = self._http_request("/pharmacies/reservations")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Reservations indisponibles.")
        return res.get("data") or []

    def update_reservation_status(self, reservation_id: str, status: str) -> dict:
        """PATCH /pharmacies/reservations/:id/status."""
        res = self._http_request(
            f"/pharmacies/reservations/{reservation_id}/status",
            method="PATCH",
            payload={"status": status},
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Mise a jour de la reservation impossible.")
        return res.get("data") or {}

    # 9. PORTAIL PHARMACIE (stock & garde)
    def update_duty_status(self, is_on_duty: bool, on_duty_until: str = None) -> dict:
        """PATCH /pharmacies/duty-status (bascule de garde du site)."""
        res = self._http_request(
            "/pharmacies/duty-status",
            method="PATCH",
            payload={"isOnDuty": is_on_duty, "onDutyUntil": on_duty_until},
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Mise a jour du statut de garde impossible.")
        return res.get("data") or {}

    def update_stock(
        self, medication_id: str, status: str, price_fcfa: int = None, quantity: int = None
    ) -> dict:
        """PUT /pharmacies/stock — medication_id doit etre un UUID reel du catalogue."""
        res = self._http_request(
            "/pharmacies/stock",
            method="PUT",
            payload={
                "medicationId": medication_id,
                "status": status,
                "priceFcfa": price_fcfa,
                "quantity": quantity,
            },
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Mise a jour du stock impossible.")
        return res.get("data") or {}

    # 10. FICHES DETAILLEES (le site appelle /doctors/:id et /pharmacies/:id)
    def get_doctor_by_id(self, doctor_id: str, lat: float = None, lng: float = None) -> dict:
        res = self._http_request(f"/doctors/{doctor_id}", query_params={"lat": lat, "lng": lng})
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Medecin introuvable.")
        return res.get("data") or {}

    def get_pharmacy_by_id(self, pharmacy_id: str, lat: float = None, lng: float = None) -> dict:
        res = self._http_request(f"/pharmacies/{pharmacy_id}", query_params={"lat": lat, "lng": lng})
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Pharmacie introuvable.")
        return res.get("data") or {}

    # 11. FAVORIS (role PATIENT)
    def get_favorites(self) -> list:
        res = self._http_request("/doctors/favorites")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Favoris indisponibles.")
        return res.get("data") or []

    def toggle_favorite(self, doctor_id: str) -> dict:
        res = self._http_request(f"/doctors/favorites/{doctor_id}", method="POST")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Favoris indisponibles.")
        return res.get("data") or {}

    # 12. ABONNEMENTS (PricingPage du site — actuellement en dur et inerte)
    def get_plans(self) -> list:
        res = self._http_request("/subscriptions/plans")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Grille tarifaire indisponible.")
        return res.get("data") or []

    def get_my_subscription(self) -> dict:
        res = self._http_request("/subscriptions/my")
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Abonnement indisponible.")
        return res.get("data") or {}

    def subscribe(self, plan_type: str, auto_renew: bool = True) -> dict:
        res = self._http_request(
            "/subscriptions/subscribe",
            method="POST",
            payload={"planType": plan_type, "autoRenew": auto_renew},
        )
        if not res.get("success"):
            raise ElamApiError(res.get("error") or "Souscription impossible.")
        return res.get("data") or {}


# Global Singleton Instance
api_client = ElamApiClient()
