import math
import re
import time
from flask import Blueprint, render_template, request, redirect, url_for
from .database import SessionLocal
from .models import (
    PharmacyProfile,
    DoctorProfile,
    ClinicProfile,
    Medication,
    PharmacyStock,
    Appointment,
    MedicationReservation,
    User,
)

web_bp = Blueprint("web", __name__)


def generated_email(prefix):
    slug = re.sub(r"[^a-z0-9]+", ".", (prefix or "provider").lower()).strip(".")
    return f"{slug or 'provider'}.{int(time.time())}@elam.local"


def calculate_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def format_travel_info(dist_km):
    if dist_km < 0.5:
        return f"{int(dist_km * 1000)} m • ~2 min"
    mins = max(3, int(dist_km * 2.5))
    return f"{dist_km} km • ~{mins} min"


@web_bp.route("/directory")
def directory_page():
    db = SessionLocal()
    try:
        return render_template(
            "directory.html",
            active_tab="directory",
            success=request.args.get("success"),
            doctors=db.query(DoctorProfile).all(),
            pharmacies=db.query(PharmacyProfile).all(),
            clinics=db.query(ClinicProfile).all(),
        )
    finally:
        db.close()


@web_bp.route("/")
def index():
    db = SessionLocal()
    try:
        user_lat, user_lng = 0.5182, 9.4215  # Akanda
        q = request.args.get("q", "").strip()

        pharmacies = db.query(PharmacyProfile).all()
        pharm_list = []
        for p in pharmacies:
            dist = calculate_distance_km(user_lat, user_lng, p.latitude, p.longitude)
            pharm_list.append({
                "id": p.id,
                "name": p.name,
                "address": p.address,
                "district": p.district,
                "phone": p.phone,
                "is_on_duty": p.is_on_duty,
                "opening_hours": p.opening_hours,
                "accepts_cnamgs": p.accepts_cnamgs,
                "distance_km": dist,
                "travel_info": format_travel_info(dist),
                "gps_url": f"https://maps.google.com/?q={p.latitude},{p.longitude}",
            })
        pharm_list.sort(key=lambda x: (not x["is_on_duty"], x["distance_km"]))

        doctors = db.query(DoctorProfile).all()
        doc_list = []
        for d in doctors:
            dist = calculate_distance_km(user_lat, user_lng, d.latitude, d.longitude)
            doc_list.append({
                "id": d.id,
                "name": f"{d.title} {d.user.first_name} {d.user.last_name}" if d.user else "Dr. Spécialiste",
                "specialty": d.specialty,
                "address": d.address,
                "district": d.district,
                "fee": d.consultation_fee,
                "accepts_cnamgs": d.accepts_cnamgs,
                "accepts_teleconsult": d.accepts_teleconsult,
                "distance_km": dist,
                "travel_info": format_travel_info(dist),
                "gps_url": f"https://maps.google.com/?q={d.latitude},{d.longitude}",
                "rating": d.rating,
            })
        doc_list.sort(key=lambda x: x["distance_km"])

        clinics = db.query(ClinicProfile).all()
        clinic_list = []
        for c in clinics:
            dist = calculate_distance_km(user_lat, user_lng, c.latitude, c.longitude)
            clinic_list.append({
                "id": c.id,
                "name": c.name,
                "type": c.type,
                "address": c.address,
                "district": c.district,
                "city": c.city,
                "phone": c.phone,
                "emergency_phone": c.emergency_phone,
                "has_emergency_247": c.has_emergency_247,
                "accepts_cnamgs": c.accepts_cnamgs,
                "services_list": c.services_list,
                "distance_km": dist,
                "travel_info": format_travel_info(dist),
                "gps_url": f"https://maps.google.com/?q={c.latitude},{c.longitude}",
            })

        med_results = None
        if q:
            meds = db.query(Medication).filter(
                (Medication.name.ilike(f"%{q}%")) | (Medication.generic_name.ilike(f"%{q}%"))
            ).all()
            if meds:
                med_results = []
                for m in meds:
                    stocks = db.query(PharmacyStock).filter(PharmacyStock.medication_id == m.id).all()
                    offers = []
                    for s in stocks:
                        dist = calculate_distance_km(user_lat, user_lng, s.pharmacy.latitude, s.pharmacy.longitude)
                        offers.append({
                            "pharmacy_name": s.pharmacy.name,
                            "district": s.pharmacy.district,
                            "phone": s.pharmacy.phone,
                            "is_on_duty": s.pharmacy.is_on_duty,
                            "status": s.status,
                            "price": s.price_fcfa,
                            "freshness": "Vérifié il y a 15 min",
                            "travel_info": format_travel_info(dist),
                            "gps_url": f"https://maps.google.com/?q={s.pharmacy.latitude},{s.pharmacy.longitude}",
                        })
                    med_results.append({
                        "medication": m,
                        "offers": offers,
                    })

        return render_template(
            "index.html",
            active_tab="home",
            pharmacies=pharm_list[:3],
            doctors=doc_list[:3],
            clinics=clinic_list[:2],
            med_results=med_results,
            query=q,
        )
    finally:
        db.close()


@web_bp.route("/pharmacies")
def pharmacies_page():
    db = SessionLocal()
    try:
        user_lat, user_lng = 0.5182, 9.4215
        q = request.args.get("q", "").strip()
        duty_only = request.args.get("duty_only", "false") == "true"
        cnamgs_only = request.args.get("cnamgs_only", "false") == "true"

        query = db.query(PharmacyProfile)
        if duty_only:
            query = query.filter(PharmacyProfile.is_on_duty == True)
        if cnamgs_only:
            query = query.filter(PharmacyProfile.accepts_cnamgs == True)

        pharmacies = query.all()
        pharm_list = []
        for p in pharmacies:
            dist = calculate_distance_km(user_lat, user_lng, p.latitude, p.longitude)
            pharm_list.append({
                "id": p.id,
                "name": p.name,
                "address": p.address,
                "district": p.district,
                "phone": p.phone,
                "is_on_duty": p.is_on_duty,
                "opening_hours": p.opening_hours,
                "accepts_cnamgs": p.accepts_cnamgs,
                "distance_km": dist,
                "travel_info": format_travel_info(dist),
                "gps_url": f"https://maps.google.com/?q={p.latitude},{p.longitude}",
            })
        pharm_list.sort(key=lambda x: (not x["is_on_duty"], x["distance_km"]))

        med_offers = None
        if q:
            med = db.query(Medication).filter(
                (Medication.name.ilike(f"%{q}%")) | (Medication.generic_name.ilike(f"%{q}%"))
            ).first()
            if med:
                stocks = db.query(PharmacyStock).filter(PharmacyStock.medication_id == med.id).all()
                med_offers = {
                    "medication": med,
                    "stocks": stocks,
                }

        return render_template(
            "pharmacies.html",
            active_tab="pharmacies",
            pharmacies=pharm_list,
            duty_only=duty_only,
            cnamgs_only=cnamgs_only,
            med_offers=med_offers,
            query=q,
        )
    finally:
        db.close()


@web_bp.route("/directory/add/pharmacy", methods=["POST"])
@web_bp.route("/pharmacies/add", methods=["POST"])
def add_pharmacy():
    db = SessionLocal()
    try:
        name = request.form.get("name", "").strip()
        phone = request.form.get("phone", "").strip()
        address = request.form.get("address", "").strip()
        if not name or not phone or not address:
            return redirect(url_for("web.pharmacies_page", error=1))

        user = User(
            email=request.form.get("email") or generated_email(name),
            phone=phone,
            first_name="Direction",
            last_name=name,
            role="PHARMACY",
        )
        db.add(user)
        db.flush()
        db.add(PharmacyProfile(
            user_id=user.id,
            name=name,
            license_number=request.form.get("license_number"),
            address=address,
            city=request.form.get("city") or "Libreville",
            district=request.form.get("district") or "Centre-ville",
            latitude=float(request.form.get("latitude") or 0.5182),
            longitude=float(request.form.get("longitude") or 9.4215),
            phone=phone,
            opening_hours=request.form.get("opening_hours") or "08h00 - 20h00",
            is_on_duty=request.form.get("is_on_duty") == "on",
            accepts_cnamgs=request.form.get("accepts_cnamgs") == "on",
        ))
        db.commit()
        if request.path.startswith("/directory"):
            return redirect(url_for("web.directory_page", success="pharmacy"))
        return redirect(url_for("web.pharmacies_page", added=1))
    except Exception:
        db.rollback()
        if request.path.startswith("/directory"):
            return redirect(url_for("web.directory_page", error=1))
        return redirect(url_for("web.pharmacies_page", error=1))
    finally:
        db.close()


@web_bp.route("/doctors")
def doctors_page():
    db = SessionLocal()
    try:
        user_lat, user_lng = 0.5182, 9.4215
        specialty = request.args.get("specialty", "ALL")
        teleconsult_only = request.args.get("teleconsult_only", "false") == "true"
        cnamgs_only = request.args.get("cnamgs_only", "false") == "true"

        query = db.query(DoctorProfile)
        if specialty and specialty != "ALL":
            query = query.filter(DoctorProfile.specialty == specialty)
        if teleconsult_only:
            query = query.filter(DoctorProfile.accepts_teleconsult == True)
        if cnamgs_only:
            query = query.filter(DoctorProfile.accepts_cnamgs == True)

        doctors = query.all()
        doc_list = []
        for d in doctors:
            dist = calculate_distance_km(user_lat, user_lng, d.latitude, d.longitude)
            doc_list.append({
                "id": d.id,
                "name": f"{d.title} {d.user.first_name} {d.user.last_name}" if d.user else "Dr. Spécialiste",
                "specialty": d.specialty,
                "sub_specialties": d.sub_specialties,
                "address": d.address,
                "district": d.district,
                "city": d.city,
                "fee": d.consultation_fee,
                "accepts_cnamgs": d.accepts_cnamgs,
                "accepts_teleconsult": d.accepts_teleconsult,
                "accepts_home_visit": d.accepts_home_visit,
                "distance_km": dist,
                "travel_info": format_travel_info(dist),
                "gps_url": f"https://maps.google.com/?q={d.latitude},{d.longitude}",
                "rating": d.rating,
                "review_count": d.review_count,
            })
        doc_list.sort(key=lambda x: x["distance_km"])

        return render_template(
            "doctors.html",
            active_tab="doctors",
            doctors=doc_list,
            specialty=specialty,
            teleconsult_only=teleconsult_only,
            cnamgs_only=cnamgs_only,
        )
    finally:
        db.close()


@web_bp.route("/directory/add/doctor", methods=["POST"])
@web_bp.route("/doctors/add", methods=["POST"])
def add_doctor():
    db = SessionLocal()
    try:
        first_name = request.form.get("first_name", "").strip()
        last_name = request.form.get("last_name", "").strip()
        phone = request.form.get("phone", "").strip()
        address = request.form.get("address", "").strip()
        specialty = request.form.get("specialty", "Médecine Générale").strip()
        if not first_name or not last_name or not phone or not address:
            return redirect(url_for("web.doctors_page", error=1))

        user = User(
            email=request.form.get("email") or generated_email(f"{first_name}.{last_name}"),
            phone=phone,
            first_name=first_name,
            last_name=last_name,
            role="DOCTOR",
        )
        db.add(user)
        db.flush()
        db.add(DoctorProfile(
            user_id=user.id,
            cnom_number=request.form.get("cnom_number"),
            title=request.form.get("title") or "Dr.",
            specialty=specialty,
            sub_specialties=request.form.get("sub_specialties"),
            bio=request.form.get("bio"),
            consultation_fee=int(request.form.get("consultation_fee") or 15000),
            accepts_cnamgs=request.form.get("accepts_cnamgs") == "on",
            accepts_teleconsult=request.form.get("accepts_teleconsult") == "on",
            accepts_home_visit=request.form.get("accepts_home_visit") == "on",
            address=address,
            city=request.form.get("city") or "Libreville",
            district=request.form.get("district") or "Centre-ville",
            latitude=float(request.form.get("latitude") or 0.391),
            longitude=float(request.form.get("longitude") or 9.449),
        ))
        db.commit()
        if request.path.startswith("/directory"):
            return redirect(url_for("web.directory_page", success="doctor"))
        return redirect(url_for("web.doctors_page", added=1))
    except Exception:
        db.rollback()
        if request.path.startswith("/directory"):
            return redirect(url_for("web.directory_page", error=1))
        return redirect(url_for("web.doctors_page", error=1))
    finally:
        db.close()


@web_bp.route("/doctors/book", methods=["POST"])
def book_appointment():
    db = SessionLocal()
    try:
        doctor_id = request.form.get("doctor_id")
        appointment_date = request.form.get("appointment_date", "2026-09-10")
        start_time = request.form.get("start_time", "09:30")
        consultation_type = request.form.get("consultation_type", "IN_PERSON")
        reason = request.form.get("reason", "Consultation de routine")

        patient = db.query(User).filter(User.role == "PATIENT").first()
        if patient and patient.patient_profile:
            apt = Appointment(
                patient_id=patient.patient_profile.id,
                doctor_id=doctor_id,
                appointment_date=appointment_date,
                start_time=start_time,
                end_time="10:00",
                type=consultation_type,
                status="REQUESTED",
                reason=reason,
            )
            db.add(apt)
            db.commit()

        return redirect(url_for("web.my_appointments", success=1))
    finally:
        db.close()


@web_bp.route("/my-appointments")
def my_appointments():
    db = SessionLocal()
    try:
        success = request.args.get("success", "0") == "1"
        appointments = db.query(Appointment).all()
        return render_template(
            "appointments.html",
            active_tab="appointments",
            appointments=appointments,
            success=success,
        )
    finally:
        db.close()


@web_bp.route("/clinics")
def clinics_page():
    db = SessionLocal()
    try:
        user_lat, user_lng = 0.5182, 9.4215
        clinics = db.query(ClinicProfile).all()
        clinic_list = []
        for c in clinics:
            dist = calculate_distance_km(user_lat, user_lng, c.latitude, c.longitude)
            clinic_list.append({
                "id": c.id,
                "name": c.name,
                "type": c.type,
                "address": c.address,
                "district": c.district,
                "city": c.city,
                "phone": c.phone,
                "emergency_phone": c.emergency_phone,
                "has_emergency_247": c.has_emergency_247,
                "accepts_cnamgs": c.accepts_cnamgs,
                "services_list": c.services_list,
                "distance_km": dist,
                "travel_info": format_travel_info(dist),
                "gps_url": f"https://maps.google.com/?q={c.latitude},{c.longitude}",
            })
        return render_template(
            "clinics.html",
            active_tab="clinics",
            clinics=clinic_list,
        )
    finally:
        db.close()


@web_bp.route("/directory/add/clinic", methods=["POST"])
@web_bp.route("/clinics/add", methods=["POST"])
def add_clinic():
    db = SessionLocal()
    try:
        name = request.form.get("name", "").strip()
        phone = request.form.get("phone", "").strip()
        address = request.form.get("address", "").strip()
        if not name or not phone or not address:
            return redirect(url_for("web.clinics_page", error=1))

        db.add(ClinicProfile(
            name=name,
            type=request.form.get("type") or "CLINIC",
            address=address,
            city=request.form.get("city") or "Libreville",
            district=request.form.get("district") or "Centre-ville",
            latitude=float(request.form.get("latitude") or 0.391),
            longitude=float(request.form.get("longitude") or 9.449),
            phone=phone,
            emergency_phone=request.form.get("emergency_phone") or "1300",
            has_emergency_247=request.form.get("has_emergency_247") == "on",
            accepts_cnamgs=request.form.get("accepts_cnamgs") == "on",
            services_list=request.form.get("services_list") or "Urgences, Médecine générale",
        ))
        db.commit()
        if request.path.startswith("/directory"):
            return redirect(url_for("web.directory_page", success="clinic"))
        return redirect(url_for("web.clinics_page", added=1))
    except Exception:
        db.rollback()
        if request.path.startswith("/directory"):
            return redirect(url_for("web.directory_page", error=1))
        return redirect(url_for("web.clinics_page", error=1))
    finally:
        db.close()


@web_bp.route("/doctor-portal")
def doctor_portal():
    db = SessionLocal()
    try:
        doctor = db.query(DoctorProfile).first()
        appointments = db.query(Appointment).all()
        return render_template(
            "doctor_portal.html",
            active_tab="doctor_portal",
            doctor=doctor,
            appointments=appointments,
        )
    finally:
        db.close()


@web_bp.route("/doctor-portal/appointment/<apt_id>/status", methods=["POST"])
def update_appointment_status(apt_id):
    db = SessionLocal()
    try:
        status = request.form.get("status", "CONFIRMED")
        apt = db.query(Appointment).filter(Appointment.id == apt_id).first()
        if apt:
            apt.status = status
            db.commit()
        return redirect(url_for("web.doctor_portal"))
    finally:
        db.close()


@web_bp.route("/pharmacy-portal")
def pharmacy_portal():
    db = SessionLocal()
    try:
        pharmacy = db.query(PharmacyProfile).first()
        stocks = db.query(PharmacyStock).filter(PharmacyStock.pharmacy_id == pharmacy.id).all() if pharmacy else []
        return render_template(
            "pharmacy_portal.html",
            active_tab="pharmacy_portal",
            pharmacy=pharmacy,
            stocks=stocks,
        )
    finally:
        db.close()


@web_bp.route("/pharmacy-portal/duty-toggle", methods=["POST"])
def toggle_duty():
    db = SessionLocal()
    try:
        pharmacy = db.query(PharmacyProfile).first()
        if pharmacy:
            pharmacy.is_on_duty = not pharmacy.is_on_duty
            db.commit()
        return redirect(url_for("web.pharmacy_portal"))
    finally:
        db.close()


@web_bp.route("/pharmacy-portal/stock/<stock_id>/status", methods=["POST"])
def update_stock_status(stock_id):
    db = SessionLocal()
    try:
        status = request.form.get("status", "IN_STOCK")
        stock = db.query(PharmacyStock).filter(PharmacyStock.id == stock_id).first()
        if stock:
            stock.status = status
            db.commit()
        return redirect(url_for("web.pharmacy_portal"))
    finally:
        db.close()


@web_bp.route("/pricing")
def pricing_page():
    return render_template("pricing.html", active_tab="pricing")
