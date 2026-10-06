from app import create_app
from app.database import SessionLocal
from app.models import ClinicProfile, DoctorProfile, PharmacyProfile, User
import uuid

def test_all_routes():
    app = create_app()
    client = app.test_client()

    routes_to_test = [
        ("/", "Explorer Waze Sante"),
        ("/?q=Amoxicilline", "Recherche Medicament Amoxicilline"),
        ("/pharmacies", "Annuaire Pharmacies"),
        ("/pharmacies?duty_only=true", "Pharmacies de garde"),
        ("/doctors", "Annuaire Medecins"),
        ("/doctors?specialty=Cardiologie", "Filtre Cardiologie"),
        ("/clinics", "Urgences et Cliniques"),
        ("/my-appointments", "Mes Rendez-vous"),
        ("/doctor-portal", "Portail Medecin"),
        ("/pharmacy-portal", "Portail Pharmacie"),
        ("/pricing", "Grille Tarifaire"),
    ]

    passed = 0
    failed = 0

    print("\n--- TESTS AUTOMATISES APPLICATION PYTHON ELAM ---")
    for url, desc in routes_to_test:
        response = client.get(url)
        if response.status_code == 200:
            print(f"  [PASS] {desc} ({url}) -> Status {response.status_code}")
            passed += 1
        else:
            print(f"  [FAIL] {desc} ({url}) -> Status {response.status_code}")
            failed += 1

    # Test booking appointment
    book_res = client.post(
        "/doctors/book",
        data={
            "doctor_id": "test-doc",
            "appointment_date": "2026-09-12",
            "start_time": "10:00",
            "consultation_type": "IN_PERSON",
            "reason": "Test consultation",
        },
    )
    if book_res.status_code in [302, 303]:
        print("  [PASS] Prise de RDV -> Status 302/303 Redirect")
        passed += 1
    else:
        print(f"  [FAIL] Prise de RDV -> Status {book_res.status_code}")
        failed += 1

    stamp = uuid.uuid4().hex[:8]
    creation_cases = [
        (
            "/doctors/add",
            {
                "first_name": "Test",
                "last_name": f"Kine{stamp}",
                "email": f"test.kine.{stamp}@elam.local",
                "phone": f"+241 06 80 {stamp[:2]} {stamp[2:4]}",
                "specialty": "Kinésithérapie",
                "address": "Cabinet test Flask",
                "consultation_fee": "12000",
                "accepts_cnamgs": "on",
            },
            "Ajout web médecin/kiné",
        ),
        (
            "/pharmacies/add",
            {
                "name": f"Pharmacie Flask {stamp}",
                "email": f"pharmacie.flask.{stamp}@elam.local",
                "phone": f"+241 07 81 {stamp[:2]} {stamp[2:4]}",
                "address": "Route test Flask",
                "accepts_cnamgs": "on",
            },
            "Ajout web pharmacie",
        ),
        (
            "/clinics/add",
            {
                "name": f"Clinique Flask {stamp}",
                "type": "CLINIC",
                "phone": f"+241 11 82 {stamp[:2]} {stamp[2:4]}",
                "address": "Boulevard test Flask",
                "has_emergency_247": "on",
                "accepts_cnamgs": "on",
            },
            "Ajout web clinique",
        ),
    ]

    for url, data, desc in creation_cases:
        response = client.post(url, data=data)
        if response.status_code in [302, 303]:
            print(f"  [PASS] {desc} -> Status 302/303 Redirect")
            passed += 1
        else:
            print(f"  [FAIL] {desc} -> Status {response.status_code}")
            failed += 1

    db = SessionLocal()
    try:
        doctor = db.query(DoctorProfile).join(User).filter(User.email == f"test.kine.{stamp}@elam.local").first()
        pharmacy = db.query(PharmacyProfile).join(User).filter(User.email == f"pharmacie.flask.{stamp}@elam.local").first()
        clinic = db.query(ClinicProfile).filter(ClinicProfile.name == f"Clinique Flask {stamp}").first()
        if doctor and pharmacy and clinic:
            print("  [PASS] Persistance ajouts web -> SQLite")
            passed += 1
        else:
            print("  [FAIL] Persistance ajouts web -> SQLite")
            failed += 1

        if doctor:
            db.delete(doctor)
        if pharmacy:
            db.delete(pharmacy)
        if clinic:
            db.delete(clinic)
        db.query(User).filter(User.email.in_([f"test.kine.{stamp}@elam.local", f"pharmacie.flask.{stamp}@elam.local"])).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

    print(f"\nRESULTATS DES TESTS : {passed} succes, {failed} echecs\n")
    if failed > 0:
        exit(1)

if __name__ == "__main__":
    test_all_routes()
