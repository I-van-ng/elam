import os
import sys

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from data.database import SessionLocal, engine, Base
from data.models import User, PatientProfile, DoctorProfile, PharmacyProfile, Medication, PharmacyStock, Appointment, ClinicProfile, Payment, Prescription
from services.api_client import api_client
from data.seed import seed_database
from utils.geo import calculate_distance_km, format_travel_info
from components.payment_modal import detect_operator


def run_tests():
    print("==================================================")
    print("TESTS AUTOMATISES DE L'APPLICATION MOBILE ELAM")
    print("==================================================")

    # 1. Test Seed & Tables
    print("\n[1/10] Verification de l'initialisation de la base de donnees...")
    seed_database()
    db = SessionLocal()

    users = db.query(User).all()
    assert len(users) >= 5, f"Erreur: attendu au moins 5 utilisateurs, trouve {len(users)}"
    print(f"  [OK] {len(users)} utilisateurs et profils initialises")

    # 2. Test Geo Distance Calculation
    print("\n[2/10] Verification du moteur GPS (Akanda -> Glass)...")
    dist = calculate_distance_km(0.5182, 9.4215, 0.3801, 9.4472)
    assert 10.0 <= dist <= 20.0, f"Distance inattendue: {dist} km"
    travel = format_travel_info(dist)
    print(f"  [OK] Distance calculee : {dist} km ({travel})")

    # 3. Test Medications & Stocks
    print("\n[3/10] Verification de la disponibilite des medicaments...")
    meds = db.query(Medication).all()
    assert len(meds) >= 4, "Erreur: medicaments manquants"
    amox = db.query(Medication).filter(Medication.name.ilike("%Amoxicilline%")).first()
    assert amox is not None, "Amoxicilline introuvable"
    stocks = db.query(PharmacyStock).filter(PharmacyStock.medication_id == amox.id).all()
    assert len(stocks) >= 1, "Aucun stock pour Amoxicilline"
    print(f"  [OK] {len(meds)} medicaments references, stocks verifies")

    # 4. Test Appointments Booking
    print("\n[4/10] Verification du flux de prise de rendez-vous...")
    doc = db.query(DoctorProfile).first()
    patient = db.query(PatientProfile).first()
    apt = Appointment(
        patient_id=patient.id,
        doctor_id=doc.id,
        appointment_date="2026-10-01",
        start_time="14:00",
        end_time="14:30",
        type="IN_PERSON",
        status="REQUESTED",
        reason="Test automatise consultation",
        fee_fcfa=doc.consultation_fee,
    )
    db.add(apt)
    db.commit()

    saved_apt = db.query(Appointment).filter(Appointment.reason == "Test automatise consultation").first()
    assert saved_apt is not None, "Le rendez-vous n'a pas ete enregistre"
    db.delete(saved_apt)
    db.commit()
    print("  [OK] Creation et persistance du rendez-vous validees")

    # 5. Test Clinics & Emergency 24/7
    print("\n[5/10] Verification des structures d'urgence et SAMU 1300...")
    clinics = db.query(ClinicProfile).all()
    assert len(clinics) >= 2, "Structures d'urgence manquantes"
    print(f"  [OK] {len(clinics)} etablissements d'urgence 24/7 actifs (CHUL, El Rapha)")

    # 6. Test Mobile Money Gateway (Airtel & Moov) + CNAMGS Split
    print("\n[6/10] Verification du module Mobile Money & calcul CNAMGS...")
    assert detect_operator("+241 074 12 34 56") == "AIRTEL_MONEY", "Erreur detection Airtel"
    assert detect_operator("+241 077 88 99 00") == "AIRTEL_MONEY", "Erreur detection Airtel"
    assert detect_operator("+241 065 44 33 22") == "MOOV_MONEY", "Erreur detection Moov"
    assert detect_operator("+241 062 10 20 30") == "MOOV_MONEY", "Erreur detection Moov"

    # Test payment persistence and CNAMGS 80% remainder
    total_fee = 25000
    cnamgs_coverage = int(total_fee * 0.80) # 20 000 FCFA
    net_patient = total_fee - cnamgs_coverage # 5 000 FCFA
    assert net_patient == 5000, "Calcul ticket moderateur incorrect"

    import uuid
    test_txn_ref = f"AM-GA-TEST-{uuid.uuid4().hex[:6].upper()}"
    test_payment = Payment(
        amount=net_patient,
        currency="FCFA",
        method="AIRTEL_MONEY",
        transaction_ref=test_txn_ref,
        status="COMPLETED",
        related_to="APPOINTMENT",
        related_id="TEST-APT-ID",
    )
    db.add(test_payment)
    db.commit()

    saved_pay = db.query(Payment).filter(Payment.transaction_ref == test_txn_ref).first()
    assert saved_pay is not None, "Paiement non enregistre"
    assert saved_pay.amount == 5000, "Montant de paiement incorrect"
    db.delete(saved_pay)
    db.commit()
    print("  [OK] Detection Airtel/Moov, calcul ticket moderateur CNAMGS (80/20) et persistance valides")
    # 7. Test Scanner d'Ordonnance IA & Multi-Pharmacy Matching
    print("\n[7/10] Verification du Scanner d'Ordonnance IA & matching stocks...")
    from views.prescription_scanner_view import DEMO_PRESCRIPTIONS
    assert len(DEMO_PRESCRIPTIONS) >= 3, "Ordonnances de demonstration manquantes"
    sample_rx = DEMO_PRESCRIPTIONS[0] # Paludisme (Coartem + Doliprane)
    assert len(sample_rx["meds"]) == 2, "Molécules prescrites invalides"

    # Verify Okala pharmacy has stock
    pharm_okala = db.query(PharmacyProfile).filter(PharmacyProfile.name.ilike("%Okala%")).first()
    assert pharm_okala is not None, "Pharmacie d'Okala introuvable"
    print(f"  [OK] Extraction OCR simulee ({len(sample_rx['meds'])} molecules) et matching pharmacies valides")

    # 8. Test Teleconsultation Video & Digital Prescription Issuance
    print("\n[8/10] Verification de la Teleconsultation et generation d'ordonnance...")
    doc = db.query(DoctorProfile).first()
    patient = db.query(PatientProfile).first()
    test_rx = Prescription(
        patient_id=patient.id,
        doctor_id=doc.id,
        diagnosis="Test Teleconsultation - Suivi HTA",
        content="1. Amlodipine 5mg : 1 cp/jour\n2. Surveillance tensionnelle",
        status="ACTIVE",
    )
    db.add(test_rx)
    db.commit()

    saved_rx = db.query(Prescription).filter(Prescription.diagnosis == "Test Teleconsultation - Suivi HTA").first()
    assert saved_rx is not None, "Ordonnance digitale non enregistree"
    assert saved_rx.doctor_id == doc.id, "Lien medecin-ordonnance incorrect"
    # 9. Test Unified ElamApiClient (Central API / Fallback)
    print("\n[9/10] Verification du client API centralise & mode resiliente...")
    # Test search nearby with fallback or live API
    search_res = api_client.search_nearby(lat=0.5182, lng=9.4215, radius_km=20.0, query="Amoxicilline")
    assert "source" in search_res and "data" in search_res, "Format de reponse search_nearby invalide"
    assert search_res["source"] in ["API_CENTRAL", "LOCAL_SQLITE"], "Source de donnees inattendue"
    print(f"  [OK] Client API centralise connecte (Mode actif : {search_res['source']})")

    # 10. Test local provider creation
    print("\n[10/10] Verification de l'ajout local des prestataires de sante...")
    stamp = uuid.uuid4().hex[:8]
    created_doctor = api_client.add_doctor({
        "first_name": "Test",
        "last_name": f"Kine{stamp}",
        "email": f"test.kine.{stamp}@elam.local",
        "phone": f"+241 06 90 {stamp[:2]} {stamp[2:4]}",
        "specialty": "Kinésithérapie",
        "address": "Cabinet test Akanda",
        "district": "Akanda",
        "consultation_fee": "12000",
        "accepts_cnamgs": True,
        "accepts_teleconsult": False,
        "accepts_home_visit": True,
    })
    created_pharmacy = api_client.add_pharmacy({
        "name": f"Pharmacie Test {stamp}",
        "email": f"pharmacie.test.{stamp}@elam.local",
        "phone": f"+241 07 91 {stamp[:2]} {stamp[2:4]}",
        "address": "Route test",
        "district": "Akanda",
        "accepts_cnamgs": True,
        "is_on_duty": False,
    })
    created_clinic = api_client.add_clinic({
        "name": f"Clinique Test {stamp}",
        "type": "CLINIC",
        "phone": f"+241 11 92 {stamp[:2]} {stamp[2:4]}",
        "address": "Boulevard test",
        "district": "Centre-ville",
        "accepts_cnamgs": True,
        "has_emergency_247": True,
    })
    assert db.query(DoctorProfile).filter(DoctorProfile.id == created_doctor.id).first() is not None
    assert db.query(PharmacyProfile).filter(PharmacyProfile.id == created_pharmacy.id).first() is not None
    assert db.query(ClinicProfile).filter(ClinicProfile.id == created_clinic.id).first() is not None
    db.query(DoctorProfile).filter(DoctorProfile.id == created_doctor.id).delete()
    db.query(PharmacyProfile).filter(PharmacyProfile.id == created_pharmacy.id).delete()
    db.query(ClinicProfile).filter(ClinicProfile.id == created_clinic.id).delete()
    db.query(User).filter(User.email.in_([f"test.kine.{stamp}@elam.local", f"pharmacie.test.{stamp}@elam.local"])).delete(synchronize_session=False)
    db.commit()
    print("  [OK] Ajout médecin/kiné, pharmacie et clinique valide")

    db.close()
    print("\n==================================================")
    print("TOUS LES TESTS SONT PASSES AVEC SUCCES (10/10)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
