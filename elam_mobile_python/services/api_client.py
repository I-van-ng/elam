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


class ElamApiClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.environ.get("ELAM_API_URL", "http://localhost:5000/api/v1")
        self.health_url = os.environ.get("ELAM_HEALTH_URL", "http://localhost:5000/health")
        self.auth_token = None
        self._last_health_check_time = 0
        self._is_online = False

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

    def _http_request(self, endpoint: str, method: str = "GET", payload: dict = None, query_params: dict = None) -> dict:
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

        data = json.dumps(payload).encode("utf-8") if payload else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        with urllib.request.urlopen(req, timeout=3.0) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)

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

    def get_pharmacies(self, duty_only: bool = False, cnamgs_only: bool = False) -> list:
        if self.is_online():
            try:
                res = self._http_request(
                    "/pharmacies",
                    query_params={"isOnDuty": "true" if duty_only else None, "acceptsCnamgs": "true" if cnamgs_only else None},
                )
                if res.get("success") and "data" in res:
                    return res["data"]
            except Exception as e:
                print(f"[API_CLIENT] Fallback local pharmacies: {e}")

        # Local SQLite Fallback
        db = SessionLocal()
        try:
            q = db.query(PharmacyProfile)
            if duty_only:
                q = q.filter(PharmacyProfile.is_on_duty == True)
            if cnamgs_only:
                q = q.filter(PharmacyProfile.accepts_cnamgs == True)
            return q.all()
        finally:
            db.close()

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

    def get_doctors(self, specialty: str = None, cnamgs_only: bool = False, teleconsult_only: bool = False) -> list:
        if self.is_online():
            try:
                res = self._http_request(
                    "/doctors",
                    query_params={
                        "specialty": specialty if specialty and specialty != "ALL" else None,
                        "acceptsCnamgs": "true" if cnamgs_only else None,
                        "acceptsTeleconsult": "true" if teleconsult_only else None,
                    },
                )
                if res.get("success") and "data" in res:
                    return res["data"]
            except Exception as e:
                print(f"[API_CLIENT] Fallback local doctors: {e}")

        # Local SQLite Fallback
        db = SessionLocal()
        try:
            q = db.query(DoctorProfile)
            if specialty and specialty != "ALL":
                q = q.filter(DoctorProfile.specialty == specialty)
            if cnamgs_only:
                q = q.filter(DoctorProfile.accepts_cnamgs == True)
            if teleconsult_only:
                q = q.filter(DoctorProfile.accepts_teleconsult == True)
            return q.all()
        finally:
            db.close()

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

    def get_clinics(self, has_emergency_247: bool = True) -> list:
        if self.is_online():
            try:
                res = self._http_request("/clinics", query_params={"hasEmergency247": "true" if has_emergency_247 else None})
                if res.get("success") and "data" in res:
                    return res["data"]
            except Exception as e:
                print(f"[API_CLIENT] Fallback local clinics: {e}")

        db = SessionLocal()
        try:
            q = db.query(ClinicProfile)
            if has_emergency_247:
                q = q.filter(ClinicProfile.has_emergency_247 == True)
            return q.all()
        finally:
            db.close()

    # 5. APPOINTMENTS
    def get_my_appointments(self) -> list:
        db = SessionLocal()
        try:
            return db.query(Appointment).all()
        finally:
            db.close()

    # 6. PAYMENTS (Mobile Money Gateway Integration)
    def initiate_payment(
        self,
        amount: int,
        phone: str,
        operator: str,
        related_to: str,
        related_id: str,
        apply_cnamgs: bool = True,
    ) -> dict:
        if not isinstance(amount, int) or amount <= 0:
            raise ValueError("Le montant du paiement est invalide.")

        if related_to not in ("APPOINTMENT", "RESERVATION", "SUBSCRIPTION"):
            raise ValueError("Type de paiement non pris en charge.")

        detected_operator = detect_mobile_money_operator(phone)
        if not detected_operator:
            raise ValueError("Numéro mobile money gabonais invalide. Airtel: 074/076/077/011, Moov: 062/065/066.")

        if operator not in ("AIRTEL_MONEY", "MOOV_MONEY"):
            raise ValueError("Opérateur mobile money non pris en charge.")

        if operator != detected_operator:
            op_name = "Airtel Money" if detected_operator == "AIRTEL_MONEY" else "Moov Money"
            raise ValueError(f"Le numéro renseigné correspond à {op_name}.")

        if self.is_online():
            try:
                res = self._http_request(
                    "/payments/initiate",
                    method="POST",
                    payload={
                        "amount": amount,
                        "phone": phone,
                        "operator": operator,
                        "relatedTo": related_to,
                        "relatedId": related_id,
                        "applyCnamgs": apply_cnamgs,
                    },
                )
                if res.get("success"):
                    return res["data"]
            except Exception as e:
                print(f"[API_CLIENT] Fallback local payment: {e}")

        # Local SQLite Fallback
        db = SessionLocal()
        try:
            cnamgs_cov = int(amount * 0.8) if apply_cnamgs else 0
            net_paid = amount - cnamgs_cov
            prefix = "AM-GA" if operator == "AIRTEL_MONEY" else "MM-GA"
            random_code = str(time.time()).replace(".", "")[-6:].upper()
            txn_ref = f"{prefix}-{random_code}"

            payment = Payment(
                amount=net_paid,
                currency="FCFA",
                method=operator,
                transaction_ref=txn_ref,
                status="COMPLETED",
                related_to=related_to,
                related_id=related_id,
            )
            db.add(payment)

            if related_to == "APPOINTMENT":
                apt = db.query(Appointment).filter(Appointment.id == related_id).first()
                if apt:
                    apt.status = "CONFIRMED"
            elif related_to == "RESERVATION":
                reservation = db.query(MedicationReservation).filter(MedicationReservation.id == related_id).first()
                if reservation:
                    reservation.status = "CONFIRMED"

            db.commit()

            return {
                "payment": payment,
                "receipt": {
                    "transactionRef": txn_ref,
                    "operator": operator,
                    "totalAmount": amount,
                    "cnamgsCovered": cnamgs_cov,
                    "netPaid": net_paid,
                    "phone": phone,
                    "status": "PAID",
                },
            }
        finally:
            db.close()


# Global Singleton Instance
api_client = ElamApiClient()
