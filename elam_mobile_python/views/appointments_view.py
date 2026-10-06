import flet as ft
from theme.colors import MedicalColors, MedicalStyles
from data.models import Appointment, DoctorProfile, User
from services.api_client import api_client, ElamApiError
from services.api_models import api_list
from utils.ui import show_toast, render_then_load


def format_appointment_date(raw) -> str:
    """L'API renvoie une date ISO (2026-12-20T00:00:00.000Z) : on l'affiche lisible."""
    text = str(raw or "")
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
        year, month, day = text[0:4], text[5:7], text[8:10]
        return f"{day}/{month}/{year}"
    return text


class AppointmentsView:
    """Python/Flet faithful reproduction of PatientAppointmentsPage.tsx from Web Frontend"""

    def __init__(self, page: ft.Page, on_open_teleconsult=None):
        self.page = page
        self.on_open_teleconsult = on_open_teleconsult
        self.list_column = ft.Column(spacing=14, scroll=ft.ScrollMode.ADAPTIVE)

    def build(self):
        # 1. Header (Matches PatientAppointmentsPage.tsx)
        header = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=12),
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.only(bottom=ft.BorderSide(1, MedicalColors.BORDER)),
            shadow=MedicalStyles.SHADOW_SM,
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text("Mes Rendez-vous 📅", size=18, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text("Vos consultations médicales et téléconsultations", size=10, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                        border_radius=12,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Text("Patient Assuré", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                    ),
                ],
            ),
        )

        # 2. Patient Info Card
        patient_card = ft.Container(
            padding=ft.Padding.all(14),
            border_radius=18,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            shadow=MedicalStyles.SHADOW_SM,
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Row(
                        spacing=12,
                        controls=[
                            ft.Container(
                                width=44,
                                height=44,
                                border_radius=14,
                                gradient=ft.LinearGradient(
                                    colors=["#10B981", "#14B8A6"],
                                    begin=ft.Alignment.TOP_LEFT,
                                    end=ft.Alignment.BOTTOM_RIGHT,
                                ),
                                alignment=ft.Alignment.CENTER,
                                content=ft.Text("HM", size=15, weight=ft.FontWeight.W_900, color="white"),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text("Hans Mba Ndong", size=14, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                                    ft.Text("N° CNAMGS : 829-102-482 (Actif)", size=11, color=MedicalColors.TEXT_SECONDARY),
                                ],
                            ),
                        ],
                    ),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                        border_radius=10,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Text("CNAMGS ✓", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                    ),
                ],
            ),
        )

        render_then_load(self.page, self.list_column, self.refresh_list)

        return ft.Column(
            expand=True,
            spacing=0,
            controls=[
                header,
                ft.Container(
                    expand=True,
                    padding=ft.Padding.symmetric(horizontal=16, vertical=12),
                    content=ft.Column(
                        expand=True,
                        spacing=14,
                        controls=[
                            patient_card,
                            ft.Text("Consultations Prévues", size=13, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Container(
                                expand=True,
                                content=self.list_column,
                            ),
                        ],
                    ),
                ),
            ],
        )

    def refresh_list(self):
        self.list_column.controls.clear()

        if not api_client.is_authenticated:
            self.list_column.controls.append(
                self._info_card("Connectez-vous pour voir vos rendez-vous.", MedicalColors.WARNING)
            )
            if self.page:
                self.page.update()
            return

        # Rendez-vous du patient CONNECTE (avant : toute la table locale)
        try:
            data = api_client.get_my_appointments()
        except ElamApiError as exc:
            self.list_column.controls.append(self._info_card(exc.message, MedicalColors.EMERGENCY))
            if self.page:
                self.page.update()
            return

        appointments = api_list(data)
        if not appointments:
            self.list_column.controls.append(
                ft.Container(
                    padding=ft.Padding.all(32),
                    alignment=ft.Alignment.CENTER,
                    content=ft.Column(
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        spacing=6,
                        controls=[
                            ft.Icon(ft.Icons.CALENDAR_MONTH_ROUNDED, size=44, color=MedicalColors.TEXT_MUTED),
                            ft.Text("Aucun rendez-vous planifié", size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY),
                            ft.Text("Prenez rendez-vous dans l'onglet Médecins", size=11, color=MedicalColors.TEXT_MUTED),
                        ],
                    ),
                )
            )
        else:
            for apt in appointments:
                self.list_column.controls.append(self._build_appointment_card(apt))

        if self.page:
            self.page.update()

    def _info_card(self, message: str, color: str):
        return ft.Container(
            padding=ft.Padding.all(16),
            border_radius=14,
            bgcolor=MedicalColors.EMERGENCY_LIGHT if color == MedicalColors.EMERGENCY else MedicalColors.WARNING_BG,
            content=ft.Text(message, size=12, color=color, weight=ft.FontWeight.W_600),
        )

    def _build_appointment_card(self, apt: Appointment):
        doc = apt.doctor
        doc_name = f"{doc.title} {doc.user.first_name} {doc.user.last_name}" if (doc and doc.user) else "Dr. Spécialiste"
        is_tele = (apt.type == "TELECONSULTATION")

        type_badge = ft.Container(
            padding=ft.Padding.symmetric(horizontal=8, vertical=3),
            border_radius=8,
            bgcolor=MedicalColors.SECONDARY_LIGHT if is_tele else MedicalColors.PRIMARY_LIGHT,
            content=ft.Text(
                "Téléconsultation 📹" if is_tele else "En Cabinet",
                size=10,
                weight=ft.FontWeight.BOLD,
                color=MedicalColors.SECONDARY if is_tele else MedicalColors.PRIMARY_DARK,
            ),
        )

        status_badge = ft.Container(
            padding=ft.Padding.symmetric(horizontal=8, vertical=3),
            border_radius=8,
            bgcolor=MedicalColors.SUCCESS_BG if apt.status == "CONFIRMED" else MedicalColors.WARNING_BG,
            content=ft.Text(
                "Confirmé ✓" if apt.status == "CONFIRMED" else "En attente",
                size=10,
                weight=ft.FontWeight.BOLD,
                color=MedicalColors.SUCCESS if apt.status == "CONFIRMED" else MedicalColors.WARNING,
            ),
        )

        return ft.Container(
            padding=ft.Padding.all(14),
            border_radius=18,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            shadow=MedicalStyles.SHADOW_SM,
            content=ft.Column(
                spacing=10,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[type_badge, status_badge],
                    ),
                    ft.Row(
                        spacing=10,
                        controls=[
                            ft.Container(
                                width=40,
                                height=40,
                                border_radius=12,
                                bgcolor=MedicalColors.SECONDARY_LIGHT,
                                alignment=ft.Alignment.CENTER,
                                content=ft.Text("🩺", size=18),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text(doc_name, size=14, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                                    ft.Text(f"{doc.specialty if doc else 'Médecine'} • {format_appointment_date(apt.appointment_date)} à {apt.start_time}", size=11, color=MedicalColors.TEXT_SECONDARY),
                                ],
                            ),
                        ],
                    ),
                    ft.Container(
                        padding=ft.Padding.all(10),
                        border_radius=12,
                        bgcolor=MedicalColors.SURFACE_VARIANT,
                        content=ft.Text(f"Motif : {apt.reason}", size=11, color=MedicalColors.TEXT_PRIMARY),
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text(f"Honoraires : {apt.fee_fcfa:,} FCFA".replace(",", " "), size=11, weight=ft.FontWeight.W_900, color=MedicalColors.PRIMARY_DARK),
                            ft.ElevatedButton(
                                "Rejoindre la visio 📹" if is_tele else "Itinéraire",
                                bgcolor=MedicalColors.SECONDARY if is_tele else MedicalColors.PRIMARY,
                                color="#FFFFFF",
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=10),
                                    padding=ft.Padding.symmetric(horizontal=12, vertical=6),
                                ),
                                on_click=lambda _, name=doc_name, spec=doc.specialty if doc else "Cardiologie": (
                                    self.on_open_teleconsult(name, spec) if (is_tele and self.on_open_teleconsult)
                                    else show_toast(self.page, f"Itinéraire vers le cabinet de {doc_name}...", MedicalColors.PRIMARY)
                                ),
                            ),
                        ],
                    ),
                ],
            ),
        )
