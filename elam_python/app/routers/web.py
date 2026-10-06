import math
import re
import time
from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
import os

from ..database import get_db
from ..models import (
    PharmacyProfile,
    DoctorProfile,
    ClinicProfile,
    Medication,
    PharmacyStock,
    Appointment,
    MedicationReservation,
    User,
)

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

router = APIRouter()


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", ".", (value or "").lower()).strip(".")
    return cleaned or str(int(time.time()))


def _auto_email(*parts: str) -> str:
    base = ".".join(_slug(part) for part in parts if part)
    return f"{base or 'referentiel'}.{int(time.time())}@elam.local"


def _checkbox(value: str | None) -> bool:
    return value in ("on", "true", "1", "yes")


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


@router.get("/", response_class=HTMLResponse)
def page_home(request: Request, q: str = None, db: Session = Depends(get_db)):
    user_lat, user_lng = 0.5182, 9.4215  # Akanda

    # Pharmacies
    pharmacies_query = db.query(PharmacyProfile)
    pharmacies = pharmacies_query.all()
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
            "latitude": p.latitude,
            "longitude": p.longitude,
        })
    pharm_list.sort(key=lambda x: (not x["is_on_duty"], x["distance_km"]))

    # Medecins
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
            "rating": d.rating,
            "latitude": d.latitude,
            "longitude": d.longitude,
        })
    doc_list.sort(key=lambda x: x["distance_km"])

    # Urgences
    clinics = db.query(ClinicProfile).all()

    # Si recherche de medicament
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
                    offers.append({
                        "pharmacy_name": s.pharmacy.name,
                        "district": s.pharmacy.district,
                        "phone": s.pharmacy.phone,
                        "is_on_duty": s.pharmacy.is_on_duty,
                        "status": s.status,
                        "price": s.price_fcfa,
                        "freshness": "Vérifié il y a 15 min",
                    })
                med_results.append({
                    "medication": m,
                    "offers": offers,
                })

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "active_tab": "home",
            "pharmacies": pharm_list[:3],
            "doctors": doc_list[:3],
            "clinics": clinics[:2],
            "med_results": med_results,
            "query": q or "",
        },
    )


@router.get("/pharmacies", response_class=HTMLResponse)
def page_pharmacies(
    request: Request,
    q: str = None,
    duty_only: bool = False,
    cnamgs_only: bool = False,
    db: Session = Depends(get_db),
):
    user_lat, user_lng = 0.5182, 9.4215
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
        })
    pharm_list.sort(key=lambda x: (not x["is_on_duty"], x["distance_km"]))

    # Recherche medicaments
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

    return templates.TemplateResponse(
        "pharmacies.html",
        {
            "request": request,
            "active_tab": "pharmacies",
            "pharmacies": pharm_list,
            "duty_only": duty_only,
            "cnamgs_only": cnamgs_only,
            "med_offers": med_offers,
            "query": q or "",
        },
    )


@router.get("/doctors", response_class=HTMLResponse)
def page_doctors(
    request: Request,
    specialty: str = None,
    teleconsult_only: bool = False,
    cnamgs_only: bool = False,
    db: Session = Depends(get_db),
):
    user_lat, user_lng = 0.5182, 9.4215
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
            "rating": d.rating,
            "review_count": d.review_count,
        })
    doc_list.sort(key=lambda x: x["distance_km"])

    return templates.TemplateResponse(
        "doctors.html",
        {
            "request": request,
            "active_tab": "doctors",
            "doctors": doc_list,
            "specialty": specialty or "ALL",
            "teleconsult_only": teleconsult_only,
            "cnamgs_only": cnamgs_only,
        },
    )


@router.get("/directory", response_class=HTMLResponse)
def page_directory(request: Request, success: str = None, db: Session = Depends(get_db)):
    return templates.TemplateResponse(
        "directory.html",
        {
            "request": request,
            "active_tab": "directory",
            "success": success,
            "doctors": db.query(DoctorProfile).all(),
            "pharmacies": db.query(PharmacyProfile).all(),
            "clinics": db.query(ClinicProfile).all(),
        },
    )


@router.post("/directory/add/doctor")
@router.post("/doctors/add")
def add_doctor(
    first_name: str = Form(...),
    last_name: str = Form(...),
    title: str = Form("Dr."),
    specialty: str = Form(...),
    sub_specialties: str = Form(""),
    cnom_number: str = Form(""),
    phone: str = Form(...),
    email: str = Form(""),
    address: str = Form(...),
    district: str = Form("Centre-ville"),
    city: str = Form("Libreville"),
    consultation_fee: int = Form(15000),
    latitude: float = Form(0.391),
    longitude: float = Form(9.449),
    bio: str = Form(""),
    accepts_cnamgs: str = Form(None),
    accepts_teleconsult: str = Form(None),
    accepts_home_visit: str = Form(None),
    db: Session = Depends(get_db),
):
    user = User(
        email=email or _auto_email(first_name, last_name),
        phone=phone,
        first_name=first_name,
        last_name=last_name,
        role="DOCTOR",
    )
    db.add(user)
    db.flush()

    db.add(DoctorProfile(
        user_id=user.id,
        cnom_number=cnom_number or None,
        title=title or "Dr.",
        specialty=specialty,
        sub_specialties=sub_specialties or None,
        bio=bio or None,
        consultation_fee=consultation_fee,
        accepts_cnamgs=_checkbox(accepts_cnamgs),
        accepts_teleconsult=_checkbox(accepts_teleconsult),
        accepts_home_visit=_checkbox(accepts_home_visit),
        address=address,
        city=city or "Libreville",
        district=district or "Centre-ville",
        latitude=latitude,
        longitude=longitude,
        is_verified=True,
    ))
    db.commit()
    return RedirectResponse(url="/directory?success=doctor", status_code=303)


@router.post("/directory/add/pharmacy")
def add_pharmacy(
    name: str = Form(...),
    license_number: str = Form(""),
    phone: str = Form(...),
    email: str = Form(""),
    address: str = Form(...),
    district: str = Form("Centre-ville"),
    city: str = Form("Libreville"),
    latitude: float = Form(0.5182),
    longitude: float = Form(9.4215),
    opening_hours: str = Form("08h00 - 20h00"),
    is_on_duty: str = Form(None),
    accepts_cnamgs: str = Form(None),
    db: Session = Depends(get_db),
):
    user = User(
        email=email or _auto_email(name),
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
        license_number=license_number or None,
        address=address,
        city=city or "Libreville",
        district=district or "Centre-ville",
        latitude=latitude,
        longitude=longitude,
        phone=phone,
        opening_hours=opening_hours or "08h00 - 20h00",
        is_on_duty=_checkbox(is_on_duty),
        accepts_cnamgs=_checkbox(accepts_cnamgs),
    ))
    db.commit()
    return RedirectResponse(url="/directory?success=pharmacy", status_code=303)


@router.post("/directory/add/clinic")
def add_clinic(
    name: str = Form(...),
    type: str = Form("CLINIC"),
    phone: str = Form(...),
    emergency_phone: str = Form("1300"),
    address: str = Form(...),
    district: str = Form("Centre-ville"),
    city: str = Form("Libreville"),
    latitude: float = Form(0.391),
    longitude: float = Form(9.449),
    services_list: str = Form("Urgences, Médecine générale"),
    has_emergency_247: str = Form(None),
    accepts_cnamgs: str = Form(None),
    db: Session = Depends(get_db),
):
    db.add(ClinicProfile(
        name=name,
        type=type or "CLINIC",
        address=address,
        city=city or "Libreville",
        district=district or "Centre-ville",
        latitude=latitude,
        longitude=longitude,
        phone=phone,
        emergency_phone=emergency_phone or "1300",
        has_emergency_247=_checkbox(has_emergency_247),
        accepts_cnamgs=_checkbox(accepts_cnamgs),
        services_list=services_list or "Urgences, Médecine générale",
    ))
    db.commit()
    return RedirectResponse(url="/directory?success=clinic", status_code=303)


@router.post("/doctors/book", response_class=HTMLResponse)
def book_appointment(
    request: Request,
    doctor_id: str = Form(...),
    appointment_date: str = Form(...),
    start_time: str = Form(...),
    consultation_type: str = Form(...),
    reason: str = Form(...),
    db: Session = Depends(get_db),
):
    patient = db.query(User).filter(User.role == "PATIENT").first()
    if patient and patient.patient_profile:
        apt = Appointment(
            patient_id=patient.patient_profile.id,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            start_time=start_time,
            end_time="10:30",
            type=consultation_type,
            status="REQUESTED",
            reason=reason,
        )
        db.add(apt)
        db.commit()

    return RedirectResponse(url="/my-appointments?success=1", status_code=303)


@router.get("/my-appointments", response_class=HTMLResponse)
def page_my_appointments(request: Request, success: int = 0, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).all()
    return templates.TemplateResponse(
        "appointments.html",
        {
            "request": request,
            "active_tab": "appointments",
            "appointments": appointments,
            "success": success == 1,
        },
    )


@router.get("/clinics", response_class=HTMLResponse)
def page_clinics(request: Request, db: Session = Depends(get_db)):
    clinics = db.query(ClinicProfile).all()
    return templates.TemplateResponse(
        "clinics.html",
        {
            "request": request,
            "active_tab": "clinics",
            "clinics": clinics,
        },
    )


@router.get("/doctor-portal", response_class=HTMLResponse)
def page_doctor_portal(request: Request, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).all()
    doctor = db.query(DoctorProfile).first()
    return templates.TemplateResponse(
        "doctor_portal.html",
        {
            "request": request,
            "active_tab": "doctor_portal",
            "doctor": doctor,
            "appointments": appointments,
        },
    )


@router.post("/doctor-portal/appointment/{apt_id}/status")
def update_appointment_status(apt_id: str, status: str = Form(...), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == apt_id).first()
    if apt:
        apt.status = status
        db.commit()
    return RedirectResponse(url="/doctor-portal", status_code=303)


@router.get("/pharmacy-portal", response_class=HTMLResponse)
def page_pharmacy_portal(request: Request, db: Session = Depends(get_db)):
    pharmacy = db.query(PharmacyProfile).first()
    stocks = db.query(PharmacyStock).filter(PharmacyStock.pharmacy_id == pharmacy.id).all() if pharmacy else []
    return templates.TemplateResponse(
        "pharmacy_portal.html",
        {
            "request": request,
            "active_tab": "pharmacy_portal",
            "pharmacy": pharmacy,
            "stocks": stocks,
        },
    )


@router.post("/pharmacy-portal/duty-toggle")
def toggle_duty(db: Session = Depends(get_db)):
    pharmacy = db.query(PharmacyProfile).first()
    if pharmacy:
        pharmacy.is_on_duty = not pharmacy.is_on_duty
        db.commit()
    return RedirectResponse(url="/pharmacy-portal", status_code=303)


@router.post("/pharmacy-portal/stock/{stock_id}/status")
def update_stock_status(stock_id: str, status: str = Form(...), db: Session = Depends(get_db)):
    stock = db.query(PharmacyStock).filter(PharmacyStock.id == stock_id).first()
    if stock:
        stock.status = status
        db.commit()
    return RedirectResponse(url="/pharmacy-portal", status_code=303)


@router.get("/pricing", response_class=HTMLResponse)
def page_pricing(request: Request):
    return templates.TemplateResponse(
        "pricing.html",
        {
            "request": request,
            "active_tab": "pricing",
        },
    )
