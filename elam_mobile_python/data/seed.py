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
    Prescription,
    PillReminder,
    BloodDonationRequest,
    Payment,
)


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Patient Hans
        hans_user = db.query(User).filter(User.email == "patient.hans@elam.ga").first()
        if not hans_user:
            hans_user = User(
                email="patient.hans@elam.ga",
                phone="+241 07 69 50 40",
                first_name="Hans",
                last_name="Mba Ndong",
                role="PATIENT",
            )
            db.add(hans_user)
            db.flush()

        hans_patient = db.query(PatientProfile).filter(PatientProfile.user_id == hans_user.id).first()
        if not hans_patient:
            hans_patient = PatientProfile(
                user_id=hans_user.id,
                city="Libreville",
                district="Akanda",
                cnamgs_number="GA-2024-98472-CNAMGS",
                blood_group="O+",
                allergies="Pénicilline, Arachides",
                vaccination_history="BCG (Fait), Hépatite B (Fait), Fièvre Jaune (Fait 2022)",
            )
            db.add(hans_patient)
            db.flush()
        else:
            if not hans_patient.blood_group:
                hans_patient.blood_group = "O+"
                hans_patient.allergies = "Pénicilline, Arachides"
                hans_patient.vaccination_history = "BCG (Fait), Hépatite B (Fait), Fièvre Jaune (Fait 2022)"

        # 2. Doctors
        doc1_user = db.query(User).filter(User.email == "dr.minko@elam.ga").first()
        if not doc1_user:
            doc1_user = User(
                email="dr.minko@elam.ga",
                phone="+241 07 11 22 33",
                first_name="Alain",
                last_name="Minko",
                role="DOCTOR",
            )
            db.add(doc1_user)
            db.flush()

        doc1_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == doc1_user.id).first()
        if not doc1_profile:
            doc1_profile = DoctorProfile(
                user_id=doc1_user.id,
                cnom_number="CNOM-GA-2014-0412",
                title="Dr.",
                specialty="Cardiologie",
                sub_specialties="Échocardiographie, Hypertension artérielle",
                bio="Spécialiste des pathologies cardiovasculaires avec 14 ans d'expérience au Gabon.",
                consultation_fee=25000,
                accepts_cnamgs=True,
                accepts_teleconsult=True,
                accepts_home_visit=False,
                address="Cabinet Médical du Littoral, Glass",
                city="Libreville",
                district="Glass",
                latitude=0.3801,
                longitude=9.4472,
                rating=4.9,
                review_count=42,
            )
            db.add(doc1_profile)
            db.flush()

        doc2_user = db.query(User).filter(User.email == "dr.nzamba@elam.ga").first()
        if not doc2_user:
            doc2_user = User(
                email="dr.nzamba@elam.ga",
                phone="+241 06 55 44 33",
                first_name="Sylvie",
                last_name="Nzamba",
                role="DOCTOR",
            )
            db.add(doc2_user)
            db.flush()

        doc2_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == doc2_user.id).first()
        if not doc2_profile:
            doc2_profile = DoctorProfile(
                user_id=doc2_user.id,
                cnom_number="CNOM-GA-2016-0789",
                title="Dr.",
                specialty="Pédiatrie",
                sub_specialties="Néonatologie, Suivi du nourrisson, Vaccins",
                bio="Pédiatre passionnée par la santé infantile et le développement de l'enfant.",
                consultation_fee=20000,
                accepts_cnamgs=True,
                accepts_teleconsult=True,
                accepts_home_visit=True,
                address="Centre Médical d'Angondjé, Akanda",
                city="Libreville",
                district="Akanda",
                latitude=0.5255,
                longitude=9.4312,
                rating=5.0,
                review_count=58,
            )
            db.add(doc2_profile)
            db.flush()

        doc3_user = db.query(User).filter(User.email == "dr.bekale@elam.ga").first()
        if not doc3_user:
            doc3_user = User(
                email="dr.bekale@elam.ga",
                phone="+241 07 88 99 00",
                first_name="Christian",
                last_name="Bekale",
                role="DOCTOR",
            )
            db.add(doc3_user)
            db.flush()

        doc3_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == doc3_user.id).first()
        if not doc3_profile:
            doc3_profile = DoctorProfile(
                user_id=doc3_user.id,
                cnom_number="CNOM-GA-2011-0156",
                title="Dr.",
                specialty="Médecine Générale",
                sub_specialties="Bilan de santé, Paludisme, Suivi adulte et enfant",
                bio="Médecin généraliste à l'écoute pour toute consultation médicale.",
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
            db.flush()

        # 3. Pharmacies
        pharm1_user = db.query(User).filter(User.email == "contact@pharmacie-okala.ga").first()
        if not pharm1_user:
            pharm1_user = User(
                email="contact@pharmacie-okala.ga",
                phone="+241 11 73 82 90",
                first_name="Direction",
                last_name="Pharmacie Okala",
                role="PHARMACY",
            )
            db.add(pharm1_user)
            db.flush()

        pharm1_profile = db.query(PharmacyProfile).filter(PharmacyProfile.user_id == pharm1_user.id).first()
        if not pharm1_profile:
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
            db.flush()

        pharm2_user = db.query(User).filter(User.email == "contact@pharmacie-stemarie.ga").first()
        if not pharm2_user:
            pharm2_user = User(
                email="contact@pharmacie-stemarie.ga",
                phone="+241 11 76 23 45",
                first_name="Direction",
                last_name="Pharmacie Sainte-Marie",
                role="PHARMACY",
            )
            db.add(pharm2_user)
            db.flush()

        pharm2_profile = db.query(PharmacyProfile).filter(PharmacyProfile.user_id == pharm2_user.id).first()
        if not pharm2_profile:
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
            db.flush()

        pharm3_user = db.query(User).filter(User.email == "contact@pharmacie-forestiers.ga").first()
        if not pharm3_user:
            pharm3_user = User(
                email="contact@pharmacie-forestiers.ga",
                phone="+241 11 72 10 98",
                first_name="Direction",
                last_name="Pharmacie Forestiers",
                role="PHARMACY",
            )
            db.add(pharm3_user)
            db.flush()

        pharm3_profile = db.query(PharmacyProfile).filter(PharmacyProfile.user_id == pharm3_user.id).first()
        if not pharm3_profile:
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
            db.flush()

        # 4. Medications
        if not db.query(Medication).first():
            med1 = Medication(
                name="Amoxicilline 500mg",
                generic_name="Amoxicilline trihydratée",
                category="Antibiotique",
                form="Gélule",
                dosage="500mg",
                requires_prescription=True,
                code_cnamgs="CNAMGS-MED-012",
                description="Antibiotique pour infections ORL et pulmonaires.",
            )
            med2 = Medication(
                name="Doliprane 1000mg",
                generic_name="Paracétamol",
                category="Antalgique / Antipyrétique",
                form="Comprimé effervescent",
                dosage="1000mg",
                requires_prescription=False,
                code_cnamgs="CNAMGS-MED-001",
                description="Traitement des douleurs d'intensité légère à modérée et fièvre.",
            )
            med3 = Medication(
                name="Coartem 80/480mg",
                generic_name="Artéméther / Luméfantrine",
                category="Antipaludéen",
                form="Comprimé",
                dosage="80/480mg",
                requires_prescription=True,
                code_cnamgs="CNAMGS-MED-044",
                description="Traitement de première intention du paludisme simple.",
            )
            med4 = Medication(
                name="Ventoline 100µg",
                generic_name="Salbutamol",
                category="Pneumologie / Bronchodilatateur",
                form="Aérosol",
                dosage="100µg",
                requires_prescription=True,
                code_cnamgs="CNAMGS-MED-035",
                description="Traitement symptomatique de la crise d'asthme.",
            )
            db.add_all([med1, med2, med3, med4])
            db.flush()

            # Stocks
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
            db.add_all([stock1, stock2, stock3, stock4])
            db.flush()

        # 5. Clinics
        if not db.query(ClinicProfile).first():
            c1 = ClinicProfile(
                name="Centre Hospitalier Universitaire de Libreville (CHUL)",
                type="HOSPITAL",
                address="Boulevard de l'Indépendance",
                city="Libreville",
                district="Centre-ville",
                latitude=0.3910,
                longitude=9.4490,
                phone="+241 11 76 20 00",
                emergency_phone="1300",
                has_emergency_247=True,
                accepts_cnamgs=True,
                services_list="Urgences 24/7, Réanimation, Cardiologie, Chirurgie, Maternité, Scanner, Laboratoire",
            )
            c2 = ClinicProfile(
                name="Polyclinique El Rapha",
                type="CLINIC",
                address="Carrefour Angondjé, Voie Express",
                city="Libreville",
                district="Akanda",
                latitude=0.5289,
                longitude=9.4345,
                phone="+241 11 73 73 73",
                emergency_phone="+241 07 20 20 20",
                has_emergency_247=True,
                accepts_cnamgs=True,
                services_list="Urgences 24/7, Scanner & IRM, Laboratoire 24/7, Pédiatrie & Maternité, Ambulance",
            )
            db.add_all([c1, c2])
            db.flush()

        # 6. Appointments
        if not db.query(Appointment).first() and hans_patient and doc1_profile:
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
            db.flush()

        # 7. Prescriptions
        if not db.query(Prescription).first() and hans_patient and doc1_profile:
            p1 = Prescription(
                patient_id=hans_patient.id,
                doctor_id=doc1_profile.id,
                diagnosis="Hypertension Artérielle légère",
                content="1. Amlodipine 5mg : 1 comprimé le matin\n2. Régime hyposodé strict",
                status="ACTIVE",
            )
            db.add(p1)
            db.flush()

        # 8. Pill Reminders
        if not db.query(PillReminder).first() and hans_patient:
            rem1 = PillReminder(
                patient_id=hans_patient.id,
                medication_name="Amlodipine",
                dosage="5mg",
                reminder_time="08:00",
                frequency="DAILY",
            )
            db.add(rem1)
            db.flush()

        # 9. Blood Donation Requests
        if not db.query(BloodDonationRequest).first():
            br1 = BloodDonationRequest(
                clinic_name="CHU de Libreville",
                blood_type="O-",
                urgency_level="CRITICAL",
                contact_phone="1300",
                description="Urgence vitale : besoin de 3 poches pour une intervention chirurgicale.",
            )
            br2 = BloodDonationRequest(
                clinic_name="Polyclinique El Rapha",
                blood_type="A+",
                urgency_level="NORMAL",
                contact_phone="+241 11 73 73 73",
                description="Stock de sécurité bas pour le groupe A+.",
            )
            db.add_all([br1, br2])
            db.flush()

        # 10. Payments
        if not db.query(Payment).first():
            pay1 = Payment(
                amount=25000,
                method="AIRTEL_MONEY",
                transaction_ref="TXN-98234-AM",
                related_to="APPOINTMENT",
                related_id="APT-MOCK-ID",
            )
            db.add(pay1)
            db.flush()

        db.commit()
    except Exception as ex:
        db.rollback()
        raise ex
    finally:
        db.close()
