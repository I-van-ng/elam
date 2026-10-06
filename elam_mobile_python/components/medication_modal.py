import flet as ft
from theme.colors import MedicalColors, MedicalStyles
from utils.ui import show_toast, open_modal, close_modal
from utils.geo import calculate_distance_km, format_travel_info
from data.database import SessionLocal
from data.models import Medication, PharmacyStock, MedicationReservation, User
from components.payment_modal import MobileMoneyPaymentModal


class MedicationAvailabilityModal:
    """Python/Flet port of MedicationAvailabilityModal from Web Frontend"""

    def __init__(self, page: ft.Page, medication: Medication, user_lat=0.5182, user_lng=9.4215):
        self.page = page
        self.medication = medication
        self.user_lat = user_lat
        self.user_lng = user_lng
        self.dialog = None

    def show(self):
        db = SessionLocal()
        try:
            stocks = db.query(PharmacyStock).filter(PharmacyStock.medication_id == self.medication.id).all()

            offers_controls = []
            if not stocks:
                offers_controls.append(
                    ft.Container(
                        padding=ft.Padding.all(24),
                        alignment=ft.Alignment.CENTER,
                        content=ft.Column(
                            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                            spacing=6,
                            controls=[
                                ft.Icon(ft.Icons.SEARCH_OFF_ROUNDED, size=40, color=MedicalColors.TEXT_MUTED),
                                ft.Text(
                                    "Aucune officine n'a encore déclaré de stock pour ce médicament.",
                                    size=12,
                                    text_align=ft.TextAlign.CENTER,
                                    color=MedicalColors.TEXT_SECONDARY,
                                ),
                            ],
                        ),
                    )
                )
            else:
                for s in stocks:
                    p = s.pharmacy
                    dist = calculate_distance_km(self.user_lat, self.user_lng, p.latitude, p.longitude)
                    is_available = s.status == "IN_STOCK"
                    status_text = "En stock (Disponible)" if is_available else ("Stock faible" if s.status == "LOW_STOCK" else "Rupture temporaire")
                    status_color = MedicalColors.SUCCESS if is_available else (MedicalColors.WARNING if s.status == "LOW_STOCK" else MedicalColors.EMERGENCY)
                    status_bg = MedicalColors.SUCCESS_BG if is_available else (MedicalColors.WARNING_BG if s.status == "LOW_STOCK" else MedicalColors.EMERGENCY_LIGHT)

                    offer_card = ft.Container(
                        padding=ft.Padding.all(12),
                        border_radius=14,
                        bgcolor=MedicalColors.CARD_BG,
                        border=ft.Border.all(1, MedicalColors.BORDER),
                        shadow=MedicalStyles.SHADOW_SM,
                        content=ft.Column(
                            spacing=8,
                            controls=[
                                ft.Row(
                                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                    controls=[
                                        ft.Column(
                                            spacing=2,
                                            controls=[
                                                ft.Row(
                                                    spacing=6,
                                                    controls=[
                                                        ft.Text(p.name, size=13, weight=ft.FontWeight.W_800, color=MedicalColors.TEXT_PRIMARY),
                                                        ft.Container(
                                                            padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                                                            border_radius=10,
                                                            bgcolor=MedicalColors.DUTY_LIGHT if p.is_on_duty else MedicalColors.PRIMARY_LIGHT,
                                                            content=ft.Text(
                                                                "🌙 Garde" if p.is_on_duty else "Ouverte",
                                                                size=9,
                                                                weight=ft.FontWeight.BOLD,
                                                                color=MedicalColors.DUTY_GOLD if p.is_on_duty else MedicalColors.PRIMARY_DARK,
                                                            ),
                                                        ),
                                                    ],
                                                ),
                                                ft.Text(f"📍 {p.district or p.address} ({format_travel_info(dist)})", size=11, color=MedicalColors.TEXT_SECONDARY),
                                            ],
                                        ),
                                        ft.Text(f"{s.price_fcfa:,} FCFA".replace(",", " "), size=13, weight=ft.FontWeight.W_900, color=MedicalColors.PRIMARY_DARK),
                                    ],
                                ),
                                ft.Row(
                                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                    controls=[
                                        ft.Container(
                                            padding=ft.Padding.symmetric(horizontal=8, vertical=3),
                                            border_radius=6,
                                            bgcolor=status_bg,
                                            content=ft.Text(status_text, size=10, weight=ft.FontWeight.BOLD, color=status_color),
                                        ),
                                        ft.ElevatedButton(
                                            "Réserver",
                                            icon=ft.Icons.SHOPPING_BAG_ROUNDED,
                                            bgcolor=MedicalColors.PRIMARY,
                                            color="#FFFFFF",
                                            style=ft.ButtonStyle(
                                                shape=ft.RoundedRectangleBorder(radius=10),
                                                padding=ft.Padding.symmetric(horizontal=12, vertical=6),
                                            ),
                                            on_click=lambda _, stock_item=s: self._reserve_medication(stock_item),
                                        ),
                                    ],
                                ),
                            ],
                        ),
                    )
                    offers_controls.append(offer_card)

            header = ft.Container(
                padding=ft.Padding.symmetric(horizontal=16, vertical=14),
                bgcolor=MedicalColors.PRIMARY_LIGHT,
                border_radius=ft.BorderRadius(top_left=20, top_right=20, bottom_left=0, bottom_right=0),
                content=ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Row(
                            spacing=10,
                            controls=[
                                ft.Container(
                                    width=42,
                                    height=42,
                                    border_radius=14,
                                    bgcolor=MedicalColors.PRIMARY,
                                    alignment=ft.Alignment.CENTER,
                                    content=ft.Icon(ft.Icons.MEDICATION_ROUNDED, color="white", size=24),
                                ),
                                ft.Column(
                                    spacing=2,
                                    controls=[
                                        ft.Text(self.medication.name, size=16, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                                        ft.Text(f"DCI: {self.medication.generic_name} • {self.medication.form} ({self.medication.dosage})", size=11, color=MedicalColors.TEXT_SECONDARY),
                                    ],
                                ),
                            ],
                        ),
                        ft.IconButton(
                            icon=ft.Icons.CLOSE_ROUNDED,
                            icon_color=MedicalColors.TEXT_MUTED,
                            on_click=lambda _: close_modal(self.page, self.dialog),
                        ),
                    ],
                ),
            )

            body = ft.Container(
                padding=ft.Padding.all(16),
                width=380,
                content=ft.Column(
                    tight=True,
                    spacing=12,
                    controls=[
                        ft.Row(
                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                            controls=[
                                ft.Text(f"Officines avec stock ({len(stocks)})", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED),
                                ft.Text("🟢 Vérifié en direct", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                            ],
                        ),
                        ft.Column(spacing=10, scroll=ft.ScrollMode.ADAPTIVE, height=280, controls=offers_controls),
                    ],
                ),
            )

            self.dialog = ft.AlertDialog(
                content_padding=ft.Padding.all(0),
                shape=ft.RoundedRectangleBorder(radius=20),
                content=ft.Column(
                    tight=True,
                    spacing=0,
                    controls=[header, body],
                ),
            )
            open_modal(self.page, self.dialog)
        finally:
            db.close()

    def _reserve_medication(self, stock: PharmacyStock):
        db = SessionLocal()
        try:
            patient = db.query(User).filter(User.role == "PATIENT").first()
            if patient:
                res = MedicationReservation(
                    patient_id=patient.id,
                    pharmacy_id=stock.pharmacy_id,
                    medication_id=stock.medication_id,
                    quantity=1,
                    status="PENDING",
                    notes="Réservation initiée depuis l'application mobile ELAM.",
                )
                db.add(res)
                db.commit()
                db.refresh(res)
                reservation_id = res.id
            else:
                show_toast(self.page, "Patient non identifié.", MedicalColors.EMERGENCY)
                return

            close_modal(self.page, self.dialog)
            show_toast(
                self.page,
                "Réservation enregistrée. Finalisez le paiement mobile money pour confirmer.",
                MedicalColors.PRIMARY,
            )

            def after_payment(_payment_info=None):
                show_toast(
                    self.page,
                    f"✅ 1 boîte de {self.medication.name} payée et confirmée à la {stock.pharmacy.name}.",
                    MedicalColors.SUCCESS,
                )

            MobileMoneyPaymentModal(
                page=self.page,
                title="Paiement Mobile Money",
                service_name=f"Réservation {self.medication.name}",
                total_amount=stock.price_fcfa,
                is_cnamgs_eligible=stock.pharmacy.accepts_cnamgs,
                related_to="RESERVATION",
                related_id=reservation_id,
                on_success=after_payment,
            ).show()
        except Exception as ex:
            show_toast(self.page, f"Erreur lors de la réservation: {ex}", MedicalColors.EMERGENCY)
        finally:
            db.close()
