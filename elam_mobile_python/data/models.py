import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(String, default="PATIENT")  # PATIENT, DOCTOR, PHARMACY, CLINIC, ADMIN
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)
    pharmacy_profile = relationship("PharmacyProfile", back_populates="user", uselist=False)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    city = Column(String, default="Libreville")
    district = Column(String, default="Akanda")
    cnamgs_number = Column(String, nullable=True)

    # Carnet de santé basics
    blood_group = Column(String, nullable=True) # A+, O-, etc.
    allergies = Column(Text, nullable=True)
    vaccination_history = Column(Text, nullable=True)

    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")
    reservations = relationship("MedicationReservation", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    pill_reminders = relationship("PillReminder", back_populates="patient")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    cnom_number = Column(String, nullable=True)
    title = Column(String, default="Dr.")
    specialty = Column(String, nullable=False)
    sub_specialties = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    consultation_fee = Column(Integer, default=15000)  # In FCFA
    accepts_cnamgs = Column(Boolean, default=True)
    accepts_teleconsult = Column(Boolean, default=False)
    accepts_home_visit = Column(Boolean, default=False)
    address = Column(String, nullable=False)
    city = Column(String, default="Libreville")
    district = Column(String, default="Glass")
    latitude = Column(Float, default=0.39)
    longitude = Column(Float, default=9.45)
    rating = Column(Float, default=5.0)
    review_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=True)

    user = relationship("User", back_populates="doctor_profile")
    appointments = relationship("Appointment", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")


class PharmacyProfile(Base):
    __tablename__ = "pharmacy_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    name = Column(String, nullable=False)
    license_number = Column(String, nullable=True)
    address = Column(String, nullable=False)
    city = Column(String, default="Libreville")
    district = Column(String, default="Akanda")
    latitude = Column(Float, default=0.5182)
    longitude = Column(Float, default=9.4215)
    phone = Column(String, nullable=False)
    opening_hours = Column(String, default="08h00 - 20h00")
    is_on_duty = Column(Boolean, default=False)
    accepts_cnamgs = Column(Boolean, default=True)
    rating = Column(Float, default=4.8)

    user = relationship("User", back_populates="pharmacy_profile")
    stocks = relationship("PharmacyStock", back_populates="pharmacy")
    reservations = relationship("MedicationReservation", back_populates="pharmacy")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, index=True)
    generic_name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)
    form = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    requires_prescription = Column(Boolean, default=False)
    code_cnamgs = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    stocks = relationship("PharmacyStock", back_populates="medication")


class PharmacyStock(Base):
    __tablename__ = "pharmacy_stocks"

    id = Column(String, primary_key=True, default=generate_uuid)
    pharmacy_id = Column(String, ForeignKey("pharmacy_profiles.id"))
    medication_id = Column(String, ForeignKey("medications.id"))
    status = Column(String, default="IN_STOCK")  # IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    quantity = Column(Integer, default=10)
    price_fcfa = Column(Integer, default=3000)
    last_verified_at = Column(DateTime, default=datetime.datetime.utcnow)

    pharmacy = relationship("PharmacyProfile", back_populates="stocks")
    medication = relationship("Medication", back_populates="stocks")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patient_profiles.id"))
    doctor_id = Column(String, ForeignKey("doctor_profiles.id"))
    appointment_date = Column(String, nullable=False)  # "2026-09-10"
    start_time = Column(String, nullable=False)        # "09:30"
    end_time = Column(String, nullable=False)          # "10:00"
    type = Column(String, default="IN_PERSON")         # IN_PERSON, TELECONSULTATION, HOME_VISIT
    status = Column(String, default="REQUESTED")       # REQUESTED, CONFIRMED, COMPLETED, CANCELLED
    reason = Column(String, nullable=False)
    fee_fcfa = Column(Integer, default=15000)

    patient = relationship("PatientProfile", back_populates="appointments")
    doctor = relationship("DoctorProfile", back_populates="appointments")


class MedicationReservation(Base):
    __tablename__ = "medication_reservations"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patient_profiles.id"))
    pharmacy_id = Column(String, ForeignKey("pharmacy_profiles.id"))
    medication_id = Column(String, ForeignKey("medications.id"))
    quantity = Column(Integer, default=1)
    status = Column(String, default="PENDING")  # PENDING, READY, COLLECTED, CANCELLED
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("PatientProfile", back_populates="reservations")
    pharmacy = relationship("PharmacyProfile", back_populates="reservations")
    medication = relationship("Medication")


class ClinicProfile(Base):
    __tablename__ = "clinic_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    type = Column(String, default="CLINIC")  # HOSPITAL, CLINIC, LAB
    address = Column(String, nullable=False)
    city = Column(String, default="Libreville")
    district = Column(String, default="Centre-ville")
    latitude = Column(Float, default=0.391)
    longitude = Column(Float, default=9.449)
    phone = Column(String, nullable=False)
    emergency_phone = Column(String, default="1300")
    has_emergency_247 = Column(Boolean, default=True)
    accepts_cnamgs = Column(Boolean, default=True)
    services_list = Column(String, default="Urgences 24/7, Cardiologie, Scanner, Maternité")

    @property
    def emergency_phone_247(self):
        return self.emergency_phone or "1300"


# NEW: Digital Prescription
class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patient_profiles.id"))
    doctor_id = Column(String, ForeignKey("doctor_profiles.id"))
    date_issued = Column(DateTime, default=datetime.datetime.utcnow)
    qr_code_id = Column(String, default=generate_uuid) # For simulation
    status = Column(String, default="ACTIVE") # ACTIVE, EXPIRED, USED
    diagnosis = Column(String, nullable=True)
    content = Column(Text, nullable=False) # List of meds and posology

    patient = relationship("PatientProfile", back_populates="prescriptions")
    doctor = relationship("DoctorProfile", back_populates="prescriptions")


# NEW: Pill Reminder
class PillReminder(Base):
    __tablename__ = "pill_reminders"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patient_profiles.id"))
    medication_name = Column(String, nullable=False)
    dosage = Column(String, nullable=True)
    reminder_time = Column(String, nullable=False) # "08:00"
    frequency = Column(String, default="DAILY") # DAILY, WEEKLY
    is_active = Column(Boolean, default=True)

    patient = relationship("PatientProfile", back_populates="pill_reminders")


# NEW: Blood Donation Hub
class BloodDonationRequest(Base):
    __tablename__ = "blood_donation_requests"

    id = Column(String, primary_key=True, default=generate_uuid)
    clinic_name = Column(String, nullable=False)
    blood_type = Column(String, nullable=False) # "O+", "A-", etc.
    urgency_level = Column(String, default="NORMAL") # NORMAL, URGENT, CRITICAL
    contact_phone = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# NEW: Payment (Mobile Money Integration)
class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    amount = Column(Integer, nullable=False)
    currency = Column(String, default="FCFA")
    method = Column(String, nullable=False) # "AIRTEL_MONEY", "MOOV_MONEY"
    transaction_ref = Column(String, unique=True)
    status = Column(String, default="COMPLETED") # PENDING, COMPLETED, FAILED
    related_to = Column(String, nullable=False) # "APPOINTMENT", "RESERVATION"
    related_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
