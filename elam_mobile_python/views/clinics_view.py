import flet as ft
from theme.colors import MedicalColors, MedicalStyles
from data.models import ClinicProfile
from services.api_client import api_client, ElamApiError
from services.api_models import api_list
from utils.geo import calculate_distance_km
from utils.ui import show_toast, render_then_load
from components.provider_form_modal import ProviderFormModal


class ClinicsView:
    """Python/Flet faithful reproduction of ClinicsPage.tsx from Web Frontend"""

    def __init__(self, page: ft.Page):
        self.page = page
        self.user_lat = 0.5182
        self.user_lng = 9.4215
        self.filter_type = "ALL"  # "ALL", "HOSPITAL", "CLINIC"
        self.only_cnamgs = False
        self.search_query = ""
        self.list_column = ft.Column(spacing=14, scroll=ft.ScrollMode.ADAPTIVE)

    def build(self):
        # 1. Header (Matches ClinicsPage.tsx)
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
                            ft.Text("Urgences & Hôpitaux 24/7 🚨", size=18, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text("Services d'urgence vitale et hôpitaux au Gabon", size=10, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Container(
                        content=ft.Row(
                            spacing=8,
                            controls=[
                                ft.Container(
                                    padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                                    border_radius=12,
                                    bgcolor=MedicalColors.EMERGENCY_LIGHT,
                                    content=ft.Text("SAMU 1300", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.EMERGENCY),
                                ),
                                ft.IconButton(
                                    icon=ft.Icons.ADD_CIRCLE_ROUNDED,
                                    icon_color=MedicalColors.EMERGENCY,
                                    tooltip="Ajouter un hôpital ou une clinique",
                                    on_click=lambda _: ProviderFormModal(self.page, "clinic", on_success=self.refresh_list).show(),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
        )

        # 2. SAMU Urgent Call Banner (Matches web hero alert)
        samu_banner = ft.Container(
            padding=ft.Padding.all(16),
            border_radius=20,
            gradient=ft.LinearGradient(
                colors=["#F43F5E", "#E11D48"],
                begin=ft.Alignment.TOP_LEFT,
                end=ft.Alignment.BOTTOM_RIGHT,
            ),
            shadow=MedicalStyles.SHADOW_EMERGENCY,
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
                                bgcolor="rgba(255, 255, 255, 0.2)",
                                alignment=ft.Alignment.CENTER,
                                content=ft.Text("🚨", size=22),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text("SAMU GABON (URGENCE VITALE)", size=13, weight=ft.FontWeight.W_900, color="white"),
                                    ft.Text("Numéro vert gratuit accessible 24h/24", size=10, color="rgba(255, 255, 255, 0.9)"),
                                ],
                            ),
                        ],
                    ),
                    ft.ElevatedButton(
                        "1300",
                        icon=ft.Icons.PHONE_IN_TALK_ROUNDED,
                        bgcolor="#FFFFFF",
                        color=MedicalColors.EMERGENCY,
                        style=ft.ButtonStyle(
                            shape=ft.RoundedRectangleBorder(radius=12),
                            padding=ft.Padding.symmetric(horizontal=14, vertical=10),
                        ),
                        on_click=lambda _: show_toast(self.page, "📞 Appel d'urgence SAMU 1300 en cours...", MedicalColors.EMERGENCY),
                    ),
                ],
            ),
        )

        # 3. Search Bar
        self.search_input = ft.TextField(
            hint_text="Hôpital, polyclinique, quartier...",
            prefix_icon=ft.Icons.SEARCH_ROUNDED,
            bgcolor=MedicalColors.CARD_BG,
            border_color=MedicalColors.BORDER,
            border_radius=14,
            dense=True,
            on_change=self.on_search_change,
        )

        # 4. Filter Chips (Tous, Hôpitaux Publics, Cliniques Privées, CNAMGS)
        self.tab_all = self._build_type_chip("Tous", "ALL")
        self.tab_hosp = self._build_type_chip("🏥 Hôpitaux", "HOSPITAL")
        self.tab_clin = self._build_type_chip("🏨 Cliniques", "CLINIC")
        self.tab_cnamgs = self._build_cnamgs_chip()

        filter_row = ft.Row(
            spacing=8,
            scroll=ft.ScrollMode.ADAPTIVE,
            controls=[self.tab_all, self.tab_hosp, self.tab_clin, self.tab_cnamgs],
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
                            samu_banner,
                            self.search_input,
                            filter_row,
                            ft.Container(
                                expand=True,
                                content=self.list_column,
                            ),
                        ],
                    ),
                ),
            ],
        )

    def _build_type_chip(self, label: str, val: str):
        is_active = (self.filter_type == val)
        return ft.Container(
            padding=ft.Padding.symmetric(horizontal=12, vertical=7),
            border_radius=18,
            bgcolor=MedicalColors.TEXT_PRIMARY if is_active else MedicalColors.CARD_BG,
            border=None if is_active else ft.Border.all(1, MedicalColors.BORDER),
            ink=True,
            on_click=lambda _, type_val=val: self._select_type(type_val),
            content=ft.Text(
                label,
                size=11,
                weight=ft.FontWeight.BOLD,
                color="#FFFFFF" if is_active else MedicalColors.TEXT_SECONDARY,
            ),
        )

    def _build_cnamgs_chip(self):
        return ft.Container(
            padding=ft.Padding.symmetric(horizontal=12, vertical=7),
            border_radius=18,
            bgcolor=MedicalColors.PRIMARY if self.only_cnamgs else MedicalColors.CARD_BG,
            border=None if self.only_cnamgs else ft.Border.all(1, MedicalColors.BORDER),
            ink=True,
            on_click=lambda _: self._toggle_cnamgs(),
            content=ft.Text(
                "🛡️ CNAMGS",
                size=11,
                weight=ft.FontWeight.BOLD,
                color="#FFFFFF" if self.only_cnamgs else MedicalColors.TEXT_SECONDARY,
            ),
        )

    def _select_type(self, val: str):
        self.filter_type = val
        self.tab_all.bgcolor = MedicalColors.TEXT_PRIMARY if val == "ALL" else MedicalColors.CARD_BG
        self.tab_all.content.color = "#FFFFFF" if val == "ALL" else MedicalColors.TEXT_SECONDARY
        self.tab_hosp.bgcolor = MedicalColors.TEXT_PRIMARY if val == "HOSPITAL" else MedicalColors.CARD_BG
        self.tab_hosp.content.color = "#FFFFFF" if val == "HOSPITAL" else MedicalColors.TEXT_SECONDARY
        self.tab_clin.bgcolor = MedicalColors.TEXT_PRIMARY if val == "CLINIC" else MedicalColors.CARD_BG
        self.tab_clin.content.color = "#FFFFFF" if val == "CLINIC" else MedicalColors.TEXT_SECONDARY
        self.refresh_list()
        self.page.update()

    def _toggle_cnamgs(self):
        self.only_cnamgs = not self.only_cnamgs
        self.tab_cnamgs.bgcolor = MedicalColors.PRIMARY if self.only_cnamgs else MedicalColors.CARD_BG
        self.tab_cnamgs.content.color = "#FFFFFF" if self.only_cnamgs else MedicalColors.TEXT_SECONDARY
        self.refresh_list()
        self.page.update()

    def on_search_change(self, e):
        self.search_query = e.control.value.strip()
        self.refresh_list()

    def refresh_list(self):
        self.list_column.controls.clear()
        # Source unique de verite : l'API du backend
        try:
            data = api_client.get_clinics(
                cnamgs_only=self.only_cnamgs,
                lat=self.user_lat,
                lng=self.user_lng,
            )
        except ElamApiError as exc:
            self.list_column.controls.append(self._error_card(exc.message))
            if self.page:
                self.page.update()
            return

        clinics = api_list(data)

        # Le backend ne filtre ni par type ni par recherche : on le fait ici.
        if self.filter_type != "ALL":
            clinics = [c for c in clinics if c.type == self.filter_type]
        if self.search_query:
            needle = self.search_query.lower()
            clinics = [
                c
                for c in clinics
                if needle in (c.name or "").lower() or needle in (c.address or "").lower()
            ]

        self.list_column.controls.append(
            ft.Text(f"Établissements d'urgence ({len(clinics)})", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED)
        )

        if not clinics:
            self.list_column.controls.append(
                ft.Text("Aucun établissement ne correspond à ces critères.", size=12, color=MedicalColors.TEXT_SECONDARY)
            )

        for c in clinics:
            dist = calculate_distance_km(self.user_lat, self.user_lng, c.latitude, c.longitude)
            self.list_column.controls.append(self._build_clinic_card(c, dist))

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

    def _build_clinic_card(self, c: ClinicProfile, dist: float):
        is_hospital = (c.type == "HOSPITAL")
        badge_text = "HÔPITAL PUBLIC" if is_hospital else "CLINIQUE PRIVÉE"
        badge_color = MedicalColors.SECONDARY if is_hospital else MedicalColors.PRIMARY

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
                            ft.Container(
                                padding=ft.Padding.symmetric(horizontal=8, vertical=3),
                                border_radius=8,
                                bgcolor=MedicalColors.SECONDARY_LIGHT if is_hospital else MedicalColors.PRIMARY_LIGHT,
                                content=ft.Text(badge_text, size=9, weight=ft.FontWeight.BOLD, color=badge_color),
                            ),
                            ft.Container(
                                padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                                border_radius=6,
                                bgcolor=MedicalColors.PRIMARY_LIGHT,
                                content=ft.Text("CNAMGS ✓", size=9, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                            ) if c.accepts_cnamgs else ft.Container(),
                        ],
                    ),
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text(c.name, size=14, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Row(
                                spacing=4,
                                controls=[
                                    ft.Icon(ft.Icons.LOCATION_ON_ROUNDED, size=13, color=MedicalColors.TEXT_MUTED),
                                    ft.Text(f"{c.address}", size=11, color=MedicalColors.TEXT_SECONDARY),
                                    ft.Text(f"({dist:.1f} km)", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                ],
                            ),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.OutlinedButton(
                                "Standard",
                                icon=ft.Icons.PHONE_ROUNDED,
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=10),
                                    padding=ft.Padding.symmetric(horizontal=12, vertical=6),
                                ),
                                on_click=lambda _, ph=c.phone: show_toast(self.page, f"📞 Appel standard vers {ph}...", MedicalColors.PRIMARY),
                            ),
                            ft.ElevatedButton(
                                "Urgences 24/7",
                                icon=ft.Icons.PHONE_IN_TALK_ROUNDED,
                                bgcolor=MedicalColors.EMERGENCY,
                                color="#FFFFFF",
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=10),
                                    padding=ft.Padding.symmetric(horizontal=14, vertical=6),
                                ),
                                on_click=lambda _, num=getattr(c, 'emergency_phone', '1300'): show_toast(self.page, f"🚨 Appel urgence {num}...", MedicalColors.EMERGENCY),
                            ),
                        ],
                    ),
                ],
            ),
        )
