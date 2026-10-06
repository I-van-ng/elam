import os
import datetime
from .database import engine, Base, SessionLocal
from .models import (
    User,
    PatientProfile,
    DoctorProfile,
    PharmacyProfile,
    Medication,
    PharmacyStock,
    Appointment,
    ClinicProfile,
)


def seed_database():
    print("Initialisation de la base de donnees SQLite ELAM Gabon...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # 1. Admin & Patient Hans
    hans_user = User(
        email="patient.hans@elam.ga",
        phone="+241 07 69 50 40",
        first_name="Hans",
        last_name="Mba Ndong",
        role="PATIENT",
    )
    db.add(hans_user)
    db.flush()

    hans_patient = PatientProfile(
        user_id=hans_user.id,
        city="Libreville",
        district="Akanda",
        cnamgs_number="GA-2024-98472-CNAMGS",
    )
    db.add(hans_patient)

    # 2. Medecins
    doc1_user = User(
        email="dr.minko@elam.ga",
        phone="+241 07 11 22 33",
        first_name="Alain",
        last_name="Minko",
        role="DOCTOR",
    )
    db.add(doc1_user)
    db.flush()

    doc1_profile = DoctorProfile(
        user_id=doc1_user.id,
        cnom_number="CNOM-GA-2014-0412",
        title="Dr.",
        specialty="Cardiologie",
        sub_specialties="Echocardiographie, Hypertension arterielle",
        bio="Specialiste des pathologies cardiovasculaires avec 14 ans d'experience au Gabon.",
        consultation_fee=25000,
        accepts_cnamgs=True,
        accepts_teleconsult=True,
        accepts_home_visit=False,
        address="Cabinet Medical du Littoral, Glass",
        city="Libreville",
        district="Glass",
        latitude=0.3801,
        longitude=9.4472,
        rating=4.9,
        review_count=42,
    )
    db.add(doc1_profile)

    doc2_user = User(
        email="dr.nzamba@elam.ga",
        phone="+241 06 55 44 33",
        first_name="Sylvie",
        last_name="Nzamba",
        role="DOCTOR",
    )
    db.add(doc2_user)
    db.flush()

    doc2_profile = DoctorProfile(
        user_id=doc2_user.id,
        cnom_number="CNOM-GA-2016-0789",
        title="Dr.",
        specialty="Pediatrie",
        sub_specialties="Neonatologie, Suivi du nourrisson, Vaccins",
        bio="Pediatre passionnee par la sante infantile et le developpement de l'enfant.",
        consultation_fee=20000,
        accepts_cnamgs=True,
        accepts_teleconsult=True,
        accepts_home_visit=True,
        address="Centre Medical d'Angondje, Akanda",
        city="Libreville",
        district="Akanda",
        latitude=0.5255,
        longitude=9.4312,
        rating=5.0,
        review_count=58,
    )
    db.add(doc2_profile)

    doc3_user = User(
        email="dr.bekale@elam.ga",
        phone="+241 07 88 99 00",
        first_name="Christian",
        last_name="Bekale",
        role="DOCTOR",
    )
    db.add(doc3_user)
    db.flush()

    doc3_profile = DoctorProfile(
        user_id=doc3_user.id,
        cnom_number="CNOM-GA-2011-0156",
        title="Dr.",
        specialty="Medecine Generale",
        sub_specialties="Bilan de sante, Paludisme, Suivi adulte et enfant",
        bio="Medecin generaliste a l'ecoute pour toute consultation medicale.",
        consultation_fee=15000,
        accepts_cnamgs=True,
        accepts_teleconsult=False,
        accepts_home_visit=True,
        address="Avenue de la Nation, Montagne Sainte",
        city="Libreville",
        district="Centre-ville",
        latitude=0.3950,
        longitude=9.4510,
        rating=4.7,
        review_count=31,
    )
    db.add(doc3_profile)

    # 3. Pharmacies
    pharm1_user = User(
        email="contact@pharmacie-okala.ga",
        phone="+241 11 73 82 90",
        first_name="Direction",
        last_name="Pharmacie Okala",
        role="PHARMACY",
    )
    db.add(pharm1_user)
    db.flush()

    pharm1_profile = PharmacyProfile(
        user_id=pharm1_user.id,
        name="Pharmacie d'Okala",
        license_number="OFF-GA-2018-091",
        address="Route Nationale 1, face Station Shell Okala",
        city="Libreville",
        district="Akanda",
        latitude=0.5182,
        longitude=9.4215,
        phone="+241 11 73 82 90",
        opening_hours="24h/24 (Semaine de Garde)",
        is_on_duty=True,
        accepts_cnamgs=True,
        rating=4.8,
    )
    db.add(pharm1_profile)

    pharm2_user = User(
        email="contact@pharmacie-stemarie.ga",
        phone="+241 11 76 23 45",
        first_name="Direction",
        last_name="Pharmacie Sainte-Marie",
        role="PHARMACY",
    )
    db.add(pharm2_user)
    db.flush()

    pharm2_profile = PharmacyProfile(
        user_id=pharm2_user.id,
        name="Grande Pharmacie Sainte-Marie",
        license_number="OFF-GA-2012-014",
        address="Boulevard Triomphal Omar Bongo",
        city="Libreville",
        district="Centre-ville",
        latitude=0.3924,
        longitude=9.4542,
        phone="+241 11 76 23 45",
        opening_hours="07h30 - 21h30",
        is_on_duty=False,
        accepts_cnamgs=True,
        rating=4.9,
    )
    db.add(pharm2_profile)

    pharm3_user = User(
        email="contact@pharmacie-forestiers.ga",
        phone="+241 11 72 10 98",
        first_name="Direction",
        last_name="Pharmacie Forestiers",
        role="PHARMACY",
    )
    db.add(pharm3_user)
    db.flush()

    pharm3_profile = PharmacyProfile(
        user_id=pharm3_user.id,
        name="Pharmacie des Forestiers",
        license_number="OFF-GA-2015-055",
        address="Carrefour Glass, Avenue de Cointet",
        city="Libreville",
        district="Glass",
        latitude=0.3789,
        longitude=9.4485,
        phone="+241 11 72 10 98",
        opening_hours="08h00 - 20h00",
        is_on_duty=False,
        accepts_cnamgs=True,
        rating=4.6,
    )
    db.add(pharm3_profile)

    # 4. Medications
    med1 = Medication(
        name="Amoxicilline 500mg",
        generic_name="Amoxicilline trihydratee",
        category="Antibiotique",
        form="Gelule",
        dosage="500mg",
        requires_prescription=True,
        code_cnamgs="CNAMGS-MED-012",
        description="Antibiotique pour infections ORL et pulmonaires.",
    )
    med2 = Medication(
        name="Doliprane 1000mg",
        generic_name="Paracetamol",
        category="Antalgique / Antipyretique",
        form="Comprime effervescent",
        dosage="1000mg",
        requires_prescription=False,
        code_cnamgs="CNAMGS-MED-001",
        description="Traitement des douleurs d'intensite legere a moderee et fievre.",
    )
    med3 = Medication(
        name="Coartem 80/480mg",
        generic_name="Artemether / Lumefantrine",
        category="Antipaludeen",
        form="Comprime",
        dosage="80/480mg",
        requires_prescription=True,
        code_cnamgs="CNAMGS-MED-044",
        description="Traitement de premiere intention du paludisme simple.",
    )
    med4 = Medication(
        name="Ventoline 100µg",
        generic_name="Salbutamol",
        category="Pneumologie / Bronchodilatateur",
        form="Aerosol",
        dosage="100µg",
        requires_prescription=True,
        code_cnamgs="CNAMGS-MED-035",
        description="Traitement symptomatique de la crise d'asthme.",
    )
    db.add_all([med1, med2, med3, med4])
    db.flush()

    # 5. Stocks
    stock1 = PharmacyStock(
        pharmacy_id=pharm1_profile.id,
        medication_id=med1.id,
        status="IN_STOCK",
        quantity=45,
        price_fcfa=3500,
        last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=15),
    )
    stock2 = PharmacyStock(
        pharmacy_id=pharm1_profile.id,
        medication_id=med2.id,
        status="IN_STOCK",
        quantity=120,
        price_fcfa=1800,
        last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=8),
    )
    stock3 = PharmacyStock(
        pharmacy_id=pharm1_profile.id,
        medication_id=med3.id,
        status="IN_STOCK",
        quantity=28,
        price_fcfa=4200,
        last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=25),
    )
    stock4 = PharmacyStock(
        pharmacy_id=pharm1_profile.id,
        medication_id=med4.id,
        status="LOW_STOCK",
        quantity=3,
        price_fcfa=4900,
        last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=45),
    )

    stock5 = PharmacyStock(
        pharmacy_id=pharm2_profile.id,
        medication_id=med1.id,
        status="IN_STOCK",
        quantity=60,
        price_fcfa=3400,
        last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=10),
    )
    stock6 = PharmacyStock(
        pharmacy_id=pharm2_profile.id,
        medication_id=med2.id,
        status="IN_STOCK",
        quantity=90,
        price_fcfa=1750,
        last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=5),
    )
    db.add_all([stock1, stock2, stock3, stock4, stock5, stock6])

    # 6. Cliniques
    c1 = ClinicProfile(
        name="Centre Hospitalier Universitaire de Libreville (CHUL)",
        type="HOSPITAL",
        address="Boulevard de l'Independance",
        city="Libreville",
        district="Centre-ville",
        latitude=0.3910,
        longitude=9.4490,
        phone="+241 11 76 20 00",
        emergency_phone="1300",
        has_emergency_247=True,
        accepts_cnamgs=True,
        services_list="Urgences 24/7, Reanimation, Cardiologie, Chirurgie, Maternite, Scanner, Laboratoire",
    )
    c2 = ClinicProfile(
        name="Polyclinique El Rapha",
        type="CLINIC",
        address="Carrefour Angondje, Voie Express",
        city="Libreville",
        district="Akanda",
        latitude=0.5289,
        longitude=9.4345,
        phone="+241 11 73 73 73",
        emergency_phone="+241 07 20 20 20",
        has_emergency_247=True,
        accepts_cnamgs=True,
        services_list="Urgences 24/7, Scanner & IRM, Laboratoire 24/7, Pediatrie & Maternite, Ambulance",
    )
    db.add_all([c1, c2])

    # 7. Initial Appointment for Dr. Minko
    apt1 = Appointment(
        patient_id=hans_patient.id,
        doctor_id=doc1_profile.id,
        appointment_date="2026-09-15",
        start_time="10:00",
        end_time="10:30",
        type="IN_PERSON",
        status="CONFIRMED",
        reason="Bilan cardiovasculaire et suivi tensionnel",
        fee_fcfa=25000,
    )
    db.add(apt1)

    db.commit()
    db.close()
    print("Base de donnees ELAM Gabon initialisee avec succes.")


if __name__ == "__main__":
    seed_database()
