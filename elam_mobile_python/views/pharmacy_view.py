import flet as ft
from theme.colors import MedicalColors, MedicalStyles
from data.models import PharmacyProfile
from services.api_client import api_client, ElamApiError
from services.api_models import api_list, api_object
from utils.geo import calculate_distance_km, format_travel_info
from utils.ui import show_toast, render_then_load
from components.medication_modal import MedicationAvailabilityModal
from components.provider_form_modal import ProviderFormModal


class PharmacyView:
    """Python/Flet faithful reproduction of PharmaciesPage.tsx from Web Frontend"""

    def __init__(self, page: ft.Page):
        self.page = page
        self.user_lat = 0.5182
        self.user_lng = 9.4215
        self.only_duty = False
        self.only_cnamgs = False
        self.search_query = ""
        self.med_search_query = ""
        self.list_column = ft.Column(spacing=14, scroll=ft.ScrollMode.ADAPTIVE)

    def build(self):
        # 1. Header (Matches PharmaciesPage.tsx)
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
                            ft.Text("Pharmacies & Gardes 💊", size=18, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text("Officines ouvertes et stocks vérifiés à Libreville & Akanda", size=10, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Container(
                        content=ft.Row(
                            spacing=8,
                            controls=[
                                ft.Container(
                                    padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                                    border_radius=12,
                                    bgcolor=MedicalColors.DUTY_LIGHT,
                                    content=ft.Text("24h/24", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.DUTY_GOLD),
                                ),
                                ft.IconButton(
                                    icon=ft.Icons.ADD_CIRCLE_ROUNDED,
                                    icon_color=MedicalColors.PRIMARY,
                                    tooltip="Ajouter une pharmacie",
                                    on_click=lambda _: ProviderFormModal(self.page, "pharmacy", on_success=self.refresh_list).show(),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
        )

        # 2. Medication Search Input (Vérifier Stock)
        self.med_input = ft.TextField(
            hint_text="Tapez un médicament (ex: Amoxicilline, Doliprane...)",
            prefix_icon=ft.Icons.MEDICATION_ROUNDED,
            bgcolor=MedicalColors.CARD_BG,
            border_color=MedicalColors.BORDER,
            border_radius=14,
            dense=True,
            expand=True,
            on_submit=lambda e: self._on_med_search(e.control.value),
        )

        med_search_row = ft.Container(
            padding=ft.Padding.all(4),
            border_radius=16,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            shadow=MedicalStyles.SHADOW_SM,
            content=ft.Row(
                spacing=8,
                controls=[
                    self.med_input,
                    ft.ElevatedButton(
                        "Vérifier Stock",
                        bgcolor=MedicalColors.PRIMARY,
                        color="#FFFFFF",
                        style=ft.ButtonStyle(
                            shape=ft.RoundedRectangleBorder(radius=12),
                            padding=ft.Padding.symmetric(horizontal=12, vertical=12),
                        ),
                        on_click=lambda _: self._on_med_search(self.med_input.value or ""),
                    ),
                ],
            ),
        )

        # 3. Filter Tabs (Toutes, 🌙 De Garde 24h, 🛡️ CNAMGS)
        self.tab_all = self._build_filter_btn("Toutes", is_active=True, on_click=lambda _: self._set_filter("ALL"))
        self.tab_duty = self._build_filter_btn("🌙 De Garde (24h/24)", is_active=False, on_click=lambda _: self._set_filter("DUTY"))
        self.tab_cnamgs = self._build_filter_btn("🛡️ CNAMGS", is_active=False, on_click=lambda _: self._set_filter("CNAMGS"))

        filters_row = ft.Row(
            spacing=8,
            scroll=ft.ScrollMode.ADAPTIVE,
            controls=[self.tab_all, self.tab_duty, self.tab_cnamgs],
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
                            med_search_row,
                            filters_row,
                            ft.Container(
                                expand=True,
                                content=self.list_column,
                            ),
                        ],
                    ),
                ),
            ],
        )

    def _build_filter_btn(self, label: str, is_active: bool, on_click):
        return ft.Container(
            padding=ft.Padding.symmetric(horizontal=14, vertical=8),
            border_radius=20,
            bgcolor=MedicalColors.TEXT_PRIMARY if is_active else MedicalColors.CARD_BG,
            border=None if is_active else ft.Border.all(1, MedicalColors.BORDER),
            ink=True,
            on_click=on_click,
            content=ft.Text(
                label,
                size=11,
                weight=ft.FontWeight.BOLD,
                color="#FFFFFF" if is_active else MedicalColors.TEXT_SECONDARY,
            ),
        )

    def _set_filter(self, filter_type: str):
        if filter_type == "ALL":
            self.only_duty = False
            self.only_cnamgs = False
        elif filter_type == "DUTY":
            self.only_duty = not self.only_duty
        elif filter_type == "CNAMGS":
            self.only_cnamgs = not self.only_cnamgs

        # Update visuals
        all_active = not self.only_duty and not self.only_cnamgs
        self._update_btn_style(self.tab_all, all_active)
        self._update_btn_style(self.tab_duty, self.only_duty, active_bg=MedicalColors.DUTY_GOLD)
        self._update_btn_style(self.tab_cnamgs, self.only_cnamgs, active_bg=MedicalColors.PRIMARY)

        self.refresh_list()
        self.page.update()

    def _update_btn_style(self, container, is_active: bool, active_bg=None):
        bg = active_bg if (is_active and active_bg) else (MedicalColors.TEXT_PRIMARY if is_active else MedicalColors.CARD_BG)
        container.bgcolor = bg
        container.border = None if is_active else ft.Border.all(1, MedicalColors.BORDER)
        container.content.color = "#FFFFFF" if is_active else MedicalColors.TEXT_SECONDARY

    def _on_med_search(self, query: str):
        if not query.strip():
            show_toast(self.page, "Veuillez entrer un médicament à rechercher", MedicalColors.WARNING)
            return
        # Disponibilite reelle via l'API (plus de requete SQLite locale)
        try:
            results = api_client.search_medication_availability(
                query.strip(), self.user_lat, self.user_lng
            )
        except ElamApiError as exc:
            show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
            return

        entries = [r for r in (results or []) if isinstance(r, dict)]
        if not entries:
            show_toast(self.page, f"Aucun stock trouvé pour '{query}'", MedicalColors.WARNING)
            return

        medication = api_object(entries[0].get("medication") or {})
        MedicationAvailabilityModal(self.page, medication, self.user_lat, self.user_lng).show()

    def refresh_list(self):
        self.list_column.controls.clear()
        # Source unique de verite : l'API du backend
        try:
            data = api_client.get_pharmacies(
                duty_only=self.only_duty,
                cnamgs_only=self.only_cnamgs,
                search=self.search_query or None,
                lat=self.user_lat,
                lng=self.user_lng,
            )
        except ElamApiError as exc:
            self.list_column.controls.append(self._error_card(exc.message))
            if self.page:
                self.page.update()
            return

        pharmacies = api_list(data)
        pharm_list = []
        for p in pharmacies:
            dist = calculate_distance_km(self.user_lat, self.user_lng, p.latitude, p.longitude)
            pharm_list.append((p, dist))
        pharm_list.sort(key=lambda x: (not x[0].is_on_duty, x[1]))

        self.list_column.controls.append(
            ft.Text(f"Officines disponibles ({len(pharm_list)})", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED)
        )

        if not pharm_list:
            self.list_column.controls.append(
                ft.Text("Aucune pharmacie ne correspond à ces critères.", size=12, color=MedicalColors.TEXT_SECONDARY)
            )

        for p, dist in pharm_list:
            self.list_column.controls.append(self._build_pharmacy_card(p, dist))

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

    def _build_pharmacy_card(self, p: PharmacyProfile, dist: float):
        duty_badge = ft.Container(
            padding=ft.Padding.symmetric(horizontal=8, vertical=3),
            border_radius=10,
            bgcolor=MedicalColors.DUTY_LIGHT if p.is_on_duty else MedicalColors.PRIMARY_LIGHT,
            content=ft.Text(
                "🌙 Pharmacie de Garde" if p.is_on_duty else "Ouverte",
                size=10,
                weight=ft.FontWeight.BOLD,
                color=MedicalColors.DUTY_GOLD if p.is_on_duty else MedicalColors.PRIMARY_DARK,
            ),
        )

        cnamgs_badge = ft.Container(
            padding=ft.Padding.symmetric(horizontal=6, vertical=2),
            border_radius=6,
            bgcolor=MedicalColors.PRIMARY_LIGHT,
            content=ft.Text("CNAMGS ✓", size=9, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
        ) if p.accepts_cnamgs else ft.Container()

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
                                width=34,
                                height=34,
                                border_radius=10,
                                bgcolor=MedicalColors.PRIMARY_LIGHT,
                                alignment=ft.Alignment.CENTER,
                                content=ft.Text("💊", size=16),
                            ),
                            ft.Row(spacing=6, controls=[duty_badge, cnamgs_badge]),
                        ],
                    ),
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text(p.name, size=14, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Row(
                                spacing=4,
                                controls=[
                                    ft.Icon(ft.Icons.LOCATION_ON_ROUNDED, size=13, color=MedicalColors.TEXT_MUTED),
                                    ft.Text(f"{p.district or p.address}", size=11, color=MedicalColors.TEXT_SECONDARY),
                                    ft.Text(f"({dist:.1f} km)", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                ],
                            ),
                            ft.Row(
                                spacing=4,
                                controls=[
                                    ft.Icon(ft.Icons.ACCESS_TIME_ROUNDED, size=13, color=MedicalColors.TEXT_MUTED),
                                    ft.Text(p.opening_hours or "08h00 - 20h00", size=10, color=MedicalColors.TEXT_MUTED),
                                ],
                            ),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.OutlinedButton(
                                "Appeler",
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=10),
                                    padding=ft.Padding.symmetric(horizontal=14, vertical=6),
                                ),
                                on_click=lambda _, ph=p.phone: show_toast(self.page, f"📞 Appel vers {ph}...", MedicalColors.PRIMARY),
                            ),
                            ft.ElevatedButton(
                                "Voir les stocks",
                                bgcolor=MedicalColors.PRIMARY,
                                color="#FFFFFF",
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=10),
                                    padding=ft.Padding.symmetric(horizontal=14, vertical=6),
                                ),
                                on_click=lambda _: self._open_first_med_modal(),
                            ),
                        ],
                    ),
                ],
            ),
        )

    def _open_first_med_modal(self):
        # Catalogue du referentiel central (le site fait de meme via /pharmacies/medications/search)
        try:
            medications = api_client.list_medications()
        except ElamApiError as exc:
            show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
            return

        items = api_list(medications)
        if not items:
            show_toast(self.page, "Catalogue de médicaments vide.", MedicalColors.WARNING)
            return

        MedicationAvailabilityModal(self.page, items[0], self.user_lat, self.user_lng).show()
