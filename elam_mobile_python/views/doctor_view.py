import flet as ft
from theme.colors import MedicalColors, MedicalStyles
from data.database import SessionLocal
from data.models import DoctorProfile
from services.api_client import api_client, ElamApiError
from services.api_models import api_list
from utils.geo import calculate_distance_km
from utils.ui import show_toast, render_then_load
from components.doctor_booking_modal import DoctorBookingModal
from components.provider_form_modal import ProviderFormModal


class DoctorView:
    """Python/Flet faithful reproduction of DoctorsPage.tsx from Web Frontend"""

    def __init__(self, page: ft.Page, on_booking_success=None, on_open_teleconsult=None):
        self.page = page
        self.on_booking_success = on_booking_success
        self.on_open_teleconsult = on_open_teleconsult
        self.user_lat = 0.5182
        self.user_lng = 9.4215

        self.selected_specialty = "ALL"
        self.only_teleconsult = False
        self.only_cnamgs = False
        self.search_query = ""
        self.list_column = ft.Column(spacing=14, scroll=ft.ScrollMode.ADAPTIVE)

        self.specialties = [
            ("Toutes", "ALL"),
            ("Cardiologie", "Cardiologie"),
            ("Pédiatrie", "Pédiatrie"),
            ("Médecine Générale", "Médecine Générale"),
            ("Gynécologie", "Gynécologie"),
            ("Ophtalmologie", "Ophtalmologie"),
        ]

    def build(self):
        # 1. Header (Matches DoctorsPage.tsx)
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
                            ft.Text("Médecins & Spécialistes 🩺", size=18, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text("Prenez rendez-vous en cabinet ou en téléconsultation", size=10, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Container(
                        content=ft.Row(
                            spacing=8,
                            controls=[
                                ft.Container(
                                    padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                                    border_radius=12,
                                    bgcolor=MedicalColors.PRIMARY_LIGHT,
                                    content=ft.Text("CNOM Vérifié", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                ),
                                ft.IconButton(
                                    icon=ft.Icons.ADD_CIRCLE_ROUNDED,
                                    icon_color=MedicalColors.PRIMARY,
                                    tooltip="Ajouter un médecin, docteur ou kiné",
                                    on_click=lambda _: ProviderFormModal(self.page, "doctor", on_success=self.refresh_list).show(),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
        )

        # 2. Search Bar
        self.search_input = ft.TextField(
            hint_text="Nom, spécialité (ex: Cardiologue, Pédiatre)...",
            prefix_icon=ft.Icons.SEARCH_ROUNDED,
            bgcolor=MedicalColors.CARD_BG,
            border_color=MedicalColors.BORDER,
            border_radius=14,
            dense=True,
            on_change=self.on_search_change,
        )

        # 3. Specialty Filter Chips
        self.spec_controls = []
        for label, val in self.specialties:
            btn = self._build_spec_chip(label, val)
            self.spec_controls.append(btn)

        spec_row = ft.Row(
            spacing=8,
            scroll=ft.ScrollMode.ADAPTIVE,
            controls=self.spec_controls,
        )

        # 4. Feature Toggle Buttons (Téléconsultation, CNAMGS)
        self.tele_btn = self._build_filter_pill("Téléconsultation 📹", is_active=False, on_click=lambda _: self._toggle_tele())
        self.cnamgs_btn = self._build_filter_pill("🛡️ CNAMGS", is_active=False, on_click=lambda _: self._toggle_cnamgs())

        toggles_row = ft.Row(
            spacing=8,
            controls=[self.tele_btn, self.cnamgs_btn],
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
                        spacing=12,
                        controls=[
                            self.search_input,
                            spec_row,
                            toggles_row,
                            ft.Container(
                                expand=True,
                                content=self.list_column,
                            ),
                        ],
                    ),
                ),
            ],
        )

    def _build_spec_chip(self, label: str, val: str):
        is_selected = (self.selected_specialty == val)
        return ft.Container(
            padding=ft.Padding.symmetric(horizontal=12, vertical=7),
            border_radius=18,
            bgcolor=MedicalColors.TEXT_PRIMARY if is_selected else MedicalColors.CARD_BG,
            border=None if is_selected else ft.Border.all(1, MedicalColors.BORDER),
            ink=True,
            on_click=lambda _, specialty_val=val: self._select_specialty(specialty_val),
            content=ft.Text(
                label,
                size=11,
                weight=ft.FontWeight.BOLD,
                color="#FFFFFF" if is_selected else MedicalColors.TEXT_SECONDARY,
            ),
        )

    def _build_filter_pill(self, label: str, is_active: bool, on_click):
        return ft.Container(
            padding=ft.Padding.symmetric(horizontal=12, vertical=6),
            border_radius=16,
            bgcolor=MedicalColors.SECONDARY if is_active else MedicalColors.CARD_BG,
            border=None if is_active else ft.Border.all(1, MedicalColors.BORDER),
            ink=True,
            on_click=on_click,
            content=ft.Text(
                label,
                size=10,
                weight=ft.FontWeight.BOLD,
                color="#FFFFFF" if is_active else MedicalColors.TEXT_SECONDARY,
            ),
        )

    def _select_specialty(self, val: str):
        self.selected_specialty = val
        for idx, (label, spec_val) in enumerate(self.specialties):
            is_active = (spec_val == val)
            self.spec_controls[idx].bgcolor = MedicalColors.TEXT_PRIMARY if is_active else MedicalColors.CARD_BG
            self.spec_controls[idx].border = None if is_active else ft.Border.all(1, MedicalColors.BORDER)
            self.spec_controls[idx].content.color = "#FFFFFF" if is_active else MedicalColors.TEXT_SECONDARY
        self.refresh_list()
        self.page.update()

    def _toggle_tele(self):
        self.only_teleconsult = not self.only_teleconsult
        self.tele_btn.bgcolor = MedicalColors.SECONDARY if self.only_teleconsult else MedicalColors.CARD_BG
        self.tele_btn.border = None if self.only_teleconsult else ft.Border.all(1, MedicalColors.BORDER)
        self.tele_btn.content.color = "#FFFFFF" if self.only_teleconsult else MedicalColors.TEXT_SECONDARY
        self.refresh_list()
        self.page.update()

    def _toggle_cnamgs(self):
        self.only_cnamgs = not self.only_cnamgs
        self.cnamgs_btn.bgcolor = MedicalColors.PRIMARY if self.only_cnamgs else MedicalColors.CARD_BG
        self.cnamgs_btn.border = None if self.only_cnamgs else ft.Border.all(1, MedicalColors.BORDER)
        self.cnamgs_btn.content.color = "#FFFFFF" if self.only_cnamgs else MedicalColors.TEXT_SECONDARY
        self.refresh_list()
        self.page.update()

    def on_search_change(self, e):
        self.search_query = e.control.value.strip()
        self.refresh_list()

    def refresh_list(self):
        self.list_column.controls.clear()
        # Source unique de verite : l'API du backend (plus de requete SQLite locale)
        try:
            data = api_client.get_doctors(
                specialty=None if self.selected_specialty == "ALL" else self.selected_specialty,
                cnamgs_only=self.only_cnamgs,
                teleconsult_only=self.only_teleconsult,
                search=self.search_query or None,
                lat=self.user_lat,
                lng=self.user_lng,
            )
        except ElamApiError as exc:
            self.list_column.controls.append(self._error_card(exc.message))
            if self.page:
                self.page.update()
            return

        doctors = api_list(data)
        self.list_column.controls.append(
            ft.Text(f"Médecins disponibles ({len(doctors)})", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED)
        )

        if not doctors:
            self.list_column.controls.append(
                ft.Text("Aucun médecin ne correspond à ces critères.", size=12, color=MedicalColors.TEXT_SECONDARY)
            )

        for d in doctors:
            dist = calculate_distance_km(self.user_lat, self.user_lng, d.latitude, d.longitude)
            self.list_column.controls.append(self._build_doctor_card(d, dist))

        if self.page:
            self.page.update()

    def _error_card(self, message: str):
        """Affiche clairement l'echec au lieu de donnees fictives."""
        return ft.Container(
            padding=ft.Padding.all(16),
            border_radius=14,
            bgcolor=MedicalColors.EMERGENCY_LIGHT,
            border=ft.Border.all(1, MedicalColors.EMERGENCY),
            content=ft.Column(
                tight=True,
                spacing=4,
                controls=[
                    ft.Text("Données indisponibles", size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.EMERGENCY),
                    ft.Text(message, size=11, color=MedicalColors.TEXT_SECONDARY),
                ],
            ),
        )

    def _build_doctor_card(self, d: DoctorProfile, dist: float):
        doc_name = f"{d.title} {d.user.first_name} {d.user.last_name}" if d.user else "Dr. Spécialiste"
        initials = f"{d.user.first_name[0]}{d.user.last_name[0]}" if d.user else "DR"

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
                        controls=[
                            ft.Row(
                                spacing=10,
                                controls=[
                                    ft.Container(
                                        width=44,
                                        height=44,
                                        border_radius=14,
                                        bgcolor=MedicalColors.SECONDARY_LIGHT,
                                        alignment=ft.Alignment.CENTER,
                                        content=ft.Text(initials, size=14, weight=ft.FontWeight.W_900, color=MedicalColors.SECONDARY),
                                    ),
                                    ft.Column(
                                        spacing=2,
                                        controls=[
                                            ft.Row(
                                                spacing=4,
                                                controls=[
                                                    ft.Text(doc_name, size=14, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                                                    ft.Icon(ft.Icons.VERIFIED_ROUNDED, size=15, color=MedicalColors.PRIMARY),
                                                ],
                                            ),
                                            ft.Text(f"{d.specialty} • {d.district or 'Libreville'}", size=11, color=MedicalColors.TEXT_SECONDARY),
                                        ],
                                    ),
                                ],
                            ),
                            ft.Container(
                                padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                                border_radius=6,
                                bgcolor=MedicalColors.PRIMARY_LIGHT,
                                content=ft.Text("CNOM ✓", size=9, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                            ),
                        ],
                    ),
                    ft.Text(f"Expertise : {d.sub_specialties or 'Médecine clinique'}", size=11, color=MedicalColors.TEXT_MUTED),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text(f"Consultation : {d.consultation_fee:,} FCFA".replace(",", " "), size=11, weight=ft.FontWeight.W_900, color=MedicalColors.PRIMARY_DARK),
                            ft.Text(f"📍 {dist:.1f} km", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED),
                        ],
                    ),
                    ft.Row(
                        spacing=8,
                        controls=[
                            ft.ElevatedButton(
                                "Prendre RDV",
                                icon=ft.Icons.CALENDAR_MONTH_ROUNDED,
                                bgcolor=MedicalColors.PRIMARY,
                                color="#FFFFFF",
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=12),
                                    padding=ft.Padding.symmetric(horizontal=12, vertical=8),
                                ),
                                expand=True,
                                on_click=lambda _, doc_obj=d: DoctorBookingModal(
                                    self.page,
                                    doc_obj,
                                    on_success=self.on_booking_success,
                                ).show(),
                            ),
                            ft.OutlinedButton(
                                "Visio 📹",
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=12),
                                    padding=ft.Padding.symmetric(horizontal=12, vertical=8),
                                ),
                                on_click=lambda _, name=doc_name, sp=d.specialty: self.on_open_teleconsult(name, sp) if self.on_open_teleconsult else None,
                            ),
                        ],
                    ),
                ],
            ),
        )
