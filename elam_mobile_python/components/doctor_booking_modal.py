import datetime
import flet as ft
from theme.colors import MedicalColors, MedicalStyles
from utils.ui import show_toast, open_modal, close_modal
from data.models import DoctorProfile
from services.api_client import api_client, ElamApiError
from components.payment_modal import MobileMoneyPaymentModal


def end_time_for(start: str, minutes: int = 30) -> str:
    """Fin du creneau (+30 min par defaut), avec passage d'heure — comme le site."""
    try:
        hour, minute = (int(part) for part in start.split(":"))
    except Exception:
        return start
    total = hour * 60 + minute + minutes
    return "%02d:%02d" % ((total // 60) % 24, total % 60)



class DoctorBookingModal:
    """Python/Flet port of DoctorBookingModal from Web Frontend"""

    def __init__(self, page: ft.Page, doctor: DoctorProfile, on_success=None):
        self.page = page
        self.doctor = doctor
        self.on_success = on_success
        self.dialog = None

        self.selected_slot = "09:30"
        self.consult_type = "IN_PERSON"  # or "TELECONSULTATION"
        self.slots = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00"]
        self.slot_buttons = []

    def show(self):
        doc_name = f"{self.doctor.title} {self.doctor.user.first_name} {self.doctor.user.last_name}" if self.doctor.user else "Dr. Spécialiste"

        header = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=14),
            bgcolor=MedicalColors.SECONDARY_LIGHT,
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
                                bgcolor=MedicalColors.SECONDARY,
                                alignment=ft.Alignment.CENTER,
                                content=ft.Icon(ft.Icons.HEALTH_AND_SAFETY_ROUNDED, color="white", size=24),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text(f"RDV {doc_name}", size=15, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                                    ft.Text(f"{self.doctor.specialty} • {self.doctor.consultation_fee:,} FCFA".replace(",", " "), size=11, color=MedicalColors.TEXT_SECONDARY),
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

        reason_input = ft.TextField(
            label="Motif de consultation",
            hint_text="Ex: Suivi tensionnel, bilan annuel, avis spécialisé...",
            bgcolor=MedicalColors.CARD_BG,
            border_color=MedicalColors.BORDER,
            border_radius=12,
            dense=True,
            value="Consultation de contrôle annuel",
        )

        # Mode selector (Cabinet vs Visio)
        def set_mode(mode):
            self.consult_type = mode
            cabinet_btn.bgcolor = MedicalColors.PRIMARY if mode == "IN_PERSON" else MedicalColors.SURFACE_VARIANT
            cabinet_btn.content.controls[1].color = "#FFFFFF" if mode == "IN_PERSON" else MedicalColors.TEXT_PRIMARY
            visio_btn.bgcolor = MedicalColors.SECONDARY if mode == "TELECONSULTATION" else MedicalColors.SURFACE_VARIANT
            visio_btn.content.controls[1].color = "#FFFFFF" if mode == "TELECONSULTATION" else MedicalColors.TEXT_PRIMARY
            self.page.update()

        cabinet_btn = ft.Container(
            expand=True,
            padding=ft.Padding.symmetric(vertical=10),
            border_radius=12,
            bgcolor=MedicalColors.PRIMARY,
            alignment=ft.Alignment.CENTER,
            ink=True,
            on_click=lambda _: set_mode("IN_PERSON"),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.CENTER,
                spacing=6,
                controls=[
                    ft.Icon(ft.Icons.MEETING_ROOM_ROUNDED, size=16, color="white"),
                    ft.Text("Au Cabinet", size=11, weight=ft.FontWeight.BOLD, color="white"),
                ],
            ),
        )

        visio_btn = ft.Container(
            expand=True,
            padding=ft.Padding.symmetric(vertical=10),
            border_radius=12,
            bgcolor=MedicalColors.SURFACE_VARIANT,
            alignment=ft.Alignment.CENTER,
            ink=True,
            on_click=lambda _: set_mode("TELECONSULTATION"),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.CENTER,
                spacing=6,
                controls=[
                    ft.Icon(ft.Icons.VIDEOCAM_ROUNDED, size=16, color=MedicalColors.TEXT_PRIMARY),
                    ft.Text("Téléconsultation", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                ],
            ),
        )

        mode_row = ft.Row(spacing=8, controls=[cabinet_btn, visio_btn])

        # Slots row
        def select_slot(slot):
            self.selected_slot = slot
            for btn, s in self.slot_buttons:
                btn.bgcolor = MedicalColors.PRIMARY if s == slot else MedicalColors.SURFACE_VARIANT
                btn.content.color = "#FFFFFF" if s == slot else MedicalColors.TEXT_PRIMARY
            self.page.update()

        self.slot_buttons = []
        slot_chips = []
        for s in self.slots:
            btn = ft.Container(
                padding=ft.Padding.symmetric(horizontal=10, vertical=6),
                border_radius=10,
                bgcolor=MedicalColors.PRIMARY if s == self.selected_slot else MedicalColors.SURFACE_VARIANT,
                ink=True,
                on_click=lambda _, slot_val=s: select_slot(slot_val),
                content=ft.Text(s, size=11, weight=ft.FontWeight.BOLD, color="#FFFFFF" if s == self.selected_slot else MedicalColors.TEXT_PRIMARY),
            )
            self.slot_buttons.append((btn, s))
            slot_chips.append(btn)

        slots_flow = ft.Row(scroll=ft.ScrollMode.ADAPTIVE, spacing=6, controls=slot_chips)

        def confirm_booking(e):
            # Ecriture via l'API : on obtient un identifiant reel du backend,
            # indispensable pour que le paiement confirme le bon rendez-vous.
            if not api_client.is_authenticated:
                show_toast(
                    self.page,
                    "Connectez-vous pour prendre un rendez-vous.",
                    MedicalColors.EMERGENCY,
                )
                return

            try:
                appointment = api_client.book_appointment(
                    doctor_id=self.doctor.id,
                    appointment_date=datetime.date.today().strftime("%Y-%m-%d"),
                    start_time=self.selected_slot,
                    end_time=end_time_for(self.selected_slot),
                    appointment_type=self.consult_type,
                    reason=reason_input.value or "Consultation générale",
                )
            except ElamApiError as exc:
                show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
                return

            appointment_id = appointment.get("id")
            fee = appointment.get("feeFcfa") or self.doctor.consultation_fee

            close_modal(self.page, self.dialog)
            show_toast(
                self.page,
                "Rendez-vous enregistré. Finalisez le paiement mobile money pour confirmer.",
                MedicalColors.PRIMARY,
            )

            def after_payment(_payment_info=None):
                show_toast(
                    self.page,
                    f"✅ Paiement validé. Rendez-vous confirmé avec {doc_name} à {self.selected_slot} !",
                    MedicalColors.SUCCESS,
                )
                if self.on_success:
                    self.on_success()

            MobileMoneyPaymentModal(
                page=self.page,
                title="Paiement Mobile Money",
                service_name=f"Rendez-vous {doc_name}",
                total_amount=fee,
                is_cnamgs_eligible=self.doctor.accepts_cnamgs,
                related_to="APPOINTMENT",
                related_id=appointment_id,
                on_success=after_payment,
            ).show()

        body = ft.Container(
            padding=ft.Padding.all(16),
            width=380,
            content=ft.Column(
                tight=True,
                spacing=14,
                controls=[
                    ft.Text("Type de consultation :", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED),
                    mode_row,
                    ft.Text("Choisir un créneau horaire :", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED),
                    slots_flow,
                    reason_input,
                    ft.ElevatedButton(
                        "Continuer vers paiement",
                        icon=ft.Icons.PAYMENT_ROUNDED,
                        bgcolor=MedicalColors.PRIMARY,
                        color="#FFFFFF",
                        style=ft.ButtonStyle(
                            shape=ft.RoundedRectangleBorder(radius=12),
                            padding=ft.Padding.symmetric(vertical=14),
                        ),
                        width=380,
                        on_click=confirm_booking,
                    ),
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
