import datetime
import flet as ft
from theme.colors import MedicalColors
from data.models import PharmacyProfile, DoctorProfile, ClinicProfile, Medication
from utils.geo import calculate_distance_km
from utils.ui import show_toast, render_then_load
from components.medication_modal import MedicationAvailabilityModal
from components.doctor_booking_modal import DoctorBookingModal
from services.api_client import api_client, ElamApiError
from services.api_models import api_list, api_object


class HomeView:
    """Exact reproduction of HomePage.tsx from Web Frontend without extra effects"""

    def __init__(self, page: ft.Page, on_navigate_tab=None, on_open_scanner=None, on_open_teleconsult=None, on_toggle_theme=None):
        self.page = page
        self.on_navigate_tab = on_navigate_tab
        self.on_open_scanner = on_open_scanner
        self.on_open_teleconsult = on_open_teleconsult
        self.on_toggle_theme = on_toggle_theme

        self.user_lat = 0.5182
        self.user_lng = 9.4215
        self.location_name = "Akanda"
        self.current_role = "PATIENT"
        self.user_name = "Hans"
        self.user_initials = "HM"
        self.search_query = ""
        self.show_map = False

        self.results_column = ft.Column(spacing=16)
        self.api_status_text = None

    def set_location(self, loc_name: str, lat: float, lng: float):
        self.location_name = loc_name
        self.user_lat = lat
        self.user_lng = lng
        if hasattr(self, "location_text"):
            self.location_text.value = f"📍 {loc_name}"
        if hasattr(self, "around_text"):
            self.around_text.value = f"AUTOUR DE VOUS ({loc_name.upper()})"
        # Chargement en arriere-plan : l'ecran s'affiche immediatement
        render_then_load(self.page, self.results_column, self.refresh_content)
        self.page.update()

    def switch_demo_role(self, role: str):
        self.current_role = role
        if role == "PATIENT":
            self.user_name = "Hans"
            self.user_initials = "HM"
            self.role_button_text.value = "Hans (Patient)"
        elif role == "DOCTOR":
            self.user_name = "Dr. Minko"
            self.user_initials = "AM"
            self.role_button_text.value = "Dr. Minko"
        elif role == "PHARMACY":
            self.user_name = "Pharm. d'Okala"
            self.user_initials = "PO"
            self.role_button_text.value = "Pharm. d'Okala"

        if hasattr(self, "greeting_name"):
            self.greeting_name.value = f"Bonjour {self.user_name} 👋"
        if hasattr(self, "avatar_text"):
            self.avatar_text.value = self.user_initials

        show_toast(self.page, f"Profil démo : {self.user_name}", MedicalColors.PRIMARY)
        self.page.update()

    def build(self):
        # 1. Top Navbar (Identical to Navbar.tsx)
        brand_icon = ft.Container(
            width=36,
            height=36,
            border_radius=12,
            gradient=ft.LinearGradient(
                colors=["#10B981", "#059669"],
                begin=ft.Alignment.TOP_LEFT,
                end=ft.Alignment.BOTTOM_RIGHT,
            ),
            alignment=ft.Alignment.CENTER,
            content=ft.Icon(ft.Icons.MONITOR_HEART_ROUNDED, size=21, color="white"),
        )

        brand_title = ft.Column(
            spacing=1,
            controls=[
                ft.Row(
                    spacing=5,
                    controls=[
                        ft.Text("ELAM", size=17, weight=ft.FontWeight.W_900, color="#0F172A"),
                        ft.Container(
                            padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                            border_radius=10,
                            bgcolor="#ECFDF5",
                            content=ft.Text("Santé 🇬🇦", size=9, weight=ft.FontWeight.BOLD, color="#047857"),
                        ),
                    ],
                ),
                ft.Text("Le réflexe santé au Gabon", size=10, color="#94A3B8"),
            ],
        )

        self.role_button_text = ft.Text("Mon espace", size=11, weight=ft.FontWeight.BOLD, color="white")
        role_switcher = ft.PopupMenuButton(
            content=ft.Container(
                padding=ft.Padding.symmetric(horizontal=10, vertical=6),
                border_radius=14,
                bgcolor="#0F172A",
                content=ft.Row(
                    spacing=5,
                    tight=True,
                    controls=[
                        ft.Container(width=6, height=6, border_radius=3, bgcolor="#34D399"),
                        self.role_button_text,
                        ft.Icon(ft.Icons.ARROW_DROP_DOWN_ROUNDED, size=16, color="#94A3B8"),
                    ],
                ),
            ),
            items=[
                ft.PopupMenuItem(
                    content=ft.Text("👤 Hans (Patient)", size=12, weight=ft.FontWeight.BOLD),
                    on_click=lambda _: self.switch_demo_role("PATIENT"),
                ),
                ft.PopupMenuItem(
                    content=ft.Text("🩺 Dr. Alain Minko", size=12, weight=ft.FontWeight.BOLD),
                    on_click=lambda _: self.switch_demo_role("DOCTOR"),
                ),
                ft.PopupMenuItem(
                    content=ft.Text("💊 Pharmacie d'Okala", size=12, weight=ft.FontWeight.BOLD),
                    on_click=lambda _: self.switch_demo_role("PHARMACY"),
                ),
            ],
        )

        self.location_text = ft.Text(f"📍 {self.location_name}", size=11, weight=ft.FontWeight.BOLD, color="#047857")
        location_pill = ft.PopupMenuButton(
            content=ft.Container(
                padding=ft.Padding.symmetric(horizontal=10, vertical=6),
                border_radius=14,
                bgcolor="#ECFDF5",
                content=ft.Row(
                    spacing=4,
                    tight=True,
                    controls=[
                        self.location_text,
                        ft.Icon(ft.Icons.KEYBOARD_ARROW_DOWN_ROUNDED, size=14, color="#059669"),
                    ],
                ),
            ),
            items=[
                ft.PopupMenuItem(
                    content=ft.Text("📍 Akanda (0.518, 9.421)"),
                    on_click=lambda _: self.set_location("Akanda", 0.5182, 9.4215),
                ),
                ft.PopupMenuItem(
                    content=ft.Text("📍 Centre-ville (0.391, 9.449)"),
                    on_click=lambda _: self.set_location("Centre-ville", 0.3910, 9.4490),
                ),
                ft.PopupMenuItem(
                    content=ft.Text("📍 Glass (0.380, 9.447)"),
                    on_click=lambda _: self.set_location("Glass", 0.3801, 9.4472),
                ),
            ],
        )

        navbar = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=10),
            bgcolor="#FFFFFF",
            border=ft.Border.only(bottom=ft.BorderSide(1, "#E2E8F0")),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Row(spacing=8, controls=[brand_icon, brand_title]),
                    ft.Row(spacing=6, controls=[location_pill, role_switcher]),
                ],
            ),
        )

        # 2. Welcoming Header (Identical to Web)
        today_french = datetime.datetime.now().strftime("%A %d %B").lower()
        self.greeting_name = ft.Text(f"Bonjour {self.user_name} 👋", size=22, weight=ft.FontWeight.W_900, color="#0F172A")
        self.avatar_text = ft.Text(self.user_initials, size=13, weight=ft.FontWeight.W_900, color="white")

        greeting_section = ft.Row(
            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            controls=[
                ft.Column(
                    spacing=2,
                    controls=[
                        ft.Text(today_french, size=11, weight=ft.FontWeight.W_600, color="#94A3B8"),
                        self.greeting_name,
                        ft.Text("Comment vous sentez-vous aujourd'hui ?", size=11, color="#64748B"),
                    ],
                ),
                ft.Container(
                    width=44,
                    height=44,
                    border_radius=16,
                    gradient=ft.LinearGradient(
                        colors=["#10B981", "#14B8A6"],
                        begin=ft.Alignment.TOP_LEFT,
                        end=ft.Alignment.BOTTOM_RIGHT,
                    ),
                    alignment=ft.Alignment.CENTER,
                    content=self.avatar_text,
                ),
            ],
        )

        # 3. Clean Search Bar (White background, light gray border, Emerald button)
        self.search_input = ft.TextField(
            hint_text="Médicament, médecin, spécialité ou pharmacie...",
            prefix_icon=ft.Icons.SEARCH_ROUNDED,
            bgcolor="#FFFFFF",
            border_color="#E2E8F0",
            border_radius=14,
            dense=True,
            expand=True,
            on_change=self.on_search_change,
        )

        search_bar = ft.Container(
            padding=ft.Padding.all(4),
            border_radius=16,
            bgcolor="#FFFFFF",
            border=ft.Border.all(1, "#E2E8F0"),
            content=ft.Row(
                spacing=6,
                controls=[
                    self.search_input,
                    ft.ElevatedButton(
                        "Chercher",
                        bgcolor="#059669",
                        color="#FFFFFF",
                        style=ft.ButtonStyle(
                            shape=ft.RoundedRectangleBorder(radius=12),
                            padding=ft.Padding.symmetric(horizontal=14, vertical=12),
                        ),
                        on_click=lambda _: self._trigger_search(self.search_input.value or ""),
                    ),
                ],
            ),
        )

        # Aucun appel reseau ici : on lit le dernier etat connu (les appels reels
        # le mettent a jour). Les erreurs sont affichees par chaque ecran.
        api_online = api_client.last_known_online
        self.api_status_text = ft.Text(
            "Référentiel central ELAM connecté" if api_online else "Référentiel central en attente de connexion",
            size=10,
            weight=ft.FontWeight.BOLD,
            color="#047857" if api_online else "#92400E",
        )

        sync_banner = ft.Container(
            padding=ft.Padding.all(14),
            border_radius=18,
            bgcolor="#FFFFFF",
            border=ft.Border.all(1, "#E2E8F0"),
            content=ft.Column(
                spacing=10,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=8,
                                controls=[
                                    ft.Container(
                                        width=34,
                                        height=34,
                                        border_radius=12,
                                        bgcolor="#ECFDF5",
                                        alignment=ft.Alignment.CENTER,
                                        content=ft.Icon(ft.Icons.CLOUD_DONE_ROUNDED, size=19, color="#059669"),
                                    ),
                                    ft.Column(
                                        spacing=1,
                                        controls=[
                                            ft.Text("Même version que le site web", size=12, weight=ft.FontWeight.W_900, color="#0F172A"),
                                            self.api_status_text,
                                        ],
                                    ),
                                ],
                            ),
                            ft.Container(
                                padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                                border_radius=10,
                                bgcolor="#ECFDF5" if api_online else "#FEF3C7",
                                content=ft.Text("API /v1" if api_online else "LOCAL", size=9, weight=ft.FontWeight.BOLD, color="#047857" if api_online else "#92400E"),
                            ),
                        ],
                    ),
                    ft.Row(
                        spacing=8,
                        controls=[
                            self._build_payment_chip("Airtel Money", "*150#", "#FEE2E2", "#E60000"),
                            self._build_payment_chip("Moov Money", "*555#", "#E0F2FE", "#0054A6"),
                            self._build_payment_chip("CNAMGS", "80%", "#ECFDF5", "#047857"),
                        ],
                    ),
                ],
            ),
        )

        # 4. 4 Clean Action Tiles (Matching Web HomePage.tsx exactly)
        def handle_tile(action):
            if action == "MED":
                self._trigger_search("Amoxicilline")
            elif action == "DUTY":
                if self.on_navigate_tab:
                    self.on_navigate_tab(1)
            elif action == "DOC":
                if self.on_navigate_tab:
                    self.on_navigate_tab(2)
            elif action == "SAMU":
                show_toast(self.page, "🚨 Appel d'urgence SAMU 1300 lancé...", MedicalColors.EMERGENCY)

        tile_1 = self._build_web_tile("💊", "Médicament", "Stocks en direct", "#ECFDF5", "#059669", lambda _: handle_tile("MED"))
        tile_2 = self._build_web_tile("🌙", "Pharmacie Garde", "Ouvertes 24h", "#FEF3C7", "#D97706", lambda _: handle_tile("DUTY"))
        tile_3 = self._build_web_tile("🩺", "Médecins", "Prise de RDV", "#EFF6FF", "#2563EB", lambda _: handle_tile("DOC"))
        tile_4 = self._build_web_emergency_tile("🚨", "Urgences 1300", "SAMU Gabon", lambda _: handle_tile("SAMU"))

        tiles_row = ft.Row(
            spacing=10,
            controls=[tile_1, tile_2, tile_3, tile_4],
        )

        # 5. Around You (Autour de vous)
        self.around_text = ft.Text(f"AUTOUR DE VOUS ({self.location_name.upper()})", size=11, weight=ft.FontWeight.W_900, color="#0F172A")
        map_bar = ft.Row(
            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            controls=[
                ft.Row(
                    spacing=6,
                    controls=[
                        ft.Container(width=7, height=7, border_radius=4, bgcolor="#10B981"),
                        self.around_text,
                    ],
                ),
                ft.Container(
                    padding=ft.Padding.symmetric(horizontal=10, vertical=5),
                    border_radius=20,
                    bgcolor="#ECFDF5",
                    ink=True,
                    on_click=lambda _: show_toast(self.page, f"Carte centrée sur {self.location_name} (GPS actif)", "#059669"),
                    content=ft.Row(
                        spacing=4,
                        tight=True,
                        controls=[
                            ft.Icon(ft.Icons.MAP_OUTLINED, size=13, color="#059669"),
                            ft.Text("Afficher la carte", size=10, weight=ft.FontWeight.BOLD, color="#047857"),
                        ],
                    ),
                ),
            ],
        )

        # 6. CNAMGS Trust Banner (Matching Web)
        cnamgs_banner = ft.Container(
            padding=ft.Padding.all(14),
            border_radius=18,
            bgcolor="#ECFDF5",
            border=ft.Border.all(1, "#A7F3D0"),
            content=ft.Row(
                spacing=12,
                controls=[
                    ft.Container(
                        width=36,
                        height=36,
                        border_radius=12,
                        bgcolor="#059669",
                        alignment=ft.Alignment.CENTER,
                        content=ft.Icon(ft.Icons.SHIELD_ROUNDED, color="white", size=20),
                    ),
                    ft.Column(
                        spacing=1,
                        expand=True,
                        controls=[
                            ft.Text("Prise en charge CNAMGS & e-Santé Gabon", size=11, weight=ft.FontWeight.W_900, color="#064E3B"),
                            ft.Text("ELAM identifie les officines et médecins conventionnés pour le tiers-payant.", size=10, color="#065F46"),
                        ],
                    ),
                ],
            ),
        )

        self.refresh_content()

        # Wrap in a centered, well-proportioned container matching Web max-w-4xl
        centered_content = ft.Container(
            expand=True,
            content=ft.Container(
                expand=True,
                padding=ft.Padding.only(left=12, right=12, top=14, bottom=90),
                content=ft.Column(
                    spacing=18,
                    controls=[
                        greeting_section,
                        search_bar,
                        sync_banner,
                        tiles_row,
                        map_bar,
                        self.results_column,
                        cnamgs_banner,
                    ],
                ),
            ),
        )


        return ft.Column(
            expand=True,
            spacing=0,
            controls=[
                navbar,
                ft.Container(
                    expand=True,
                    bgcolor="#F8FAFC",
                    content=ft.ListView(
                        controls=[centered_content],
                    ),
                ),
            ],
        )

    def _build_web_tile(self, emoji: str, title: str, subtitle: str, bg_icon: str, color_icon: str, on_click):
        return ft.Container(
            expand=True,
            height=110,
            padding=ft.Padding.all(10),
            border_radius=20,
            bgcolor="#FFFFFF",
            border=ft.Border.all(1, "#E2E8F0"),
            ink=True,
            on_click=on_click,
            content=ft.Column(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                horizontal_alignment=ft.CrossAxisAlignment.START,
                controls=[
                    ft.Container(
                        width=34,
                        height=34,
                        border_radius=12,
                        bgcolor=bg_icon,
                        alignment=ft.Alignment.CENTER,
                        content=ft.Text(emoji, size=16),
                    ),
                    ft.Column(
                        spacing=1,
                        controls=[
                            ft.Text(title, size=11, weight=ft.FontWeight.W_900, color="#0F172A"),
                            ft.Text(subtitle, size=9, color="#94A3B8"),
                        ],
                    ),
                ],
            ),
        )

    def _build_payment_chip(self, title: str, subtitle: str, bg: str, color: str):
        return ft.Container(
            expand=True,
            padding=ft.Padding.symmetric(horizontal=8, vertical=7),
            border_radius=12,
            bgcolor=bg,
            content=ft.Column(
                spacing=1,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                controls=[
                    ft.Text(title, size=10, weight=ft.FontWeight.W_900, color=color, text_align=ft.TextAlign.CENTER),
                    ft.Text(subtitle, size=9, weight=ft.FontWeight.BOLD, color=color, text_align=ft.TextAlign.CENTER),
                ],
            ),
        )

    def _build_web_emergency_tile(self, emoji: str, title: str, subtitle: str, on_click):
        return ft.Container(
            expand=True,
            height=110,
            padding=ft.Padding.all(10),
            border_radius=20,
            gradient=ft.LinearGradient(
                colors=["#F43F5E", "#E11D48"],
                begin=ft.Alignment.TOP_LEFT,
                end=ft.Alignment.BOTTOM_RIGHT,
            ),
            ink=True,
            on_click=on_click,
            content=ft.Column(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                horizontal_alignment=ft.CrossAxisAlignment.START,
                controls=[
                    ft.Container(
                        width=34,
                        height=34,
                        border_radius=12,
                        bgcolor="rgba(255, 255, 255, 0.2)",
                        alignment=ft.Alignment.CENTER,
                        content=ft.Text(emoji, size=16),
                    ),
                    ft.Column(
                        spacing=1,
                        controls=[
                            ft.Text(title, size=11, weight=ft.FontWeight.W_900, color="white"),
                            ft.Text(subtitle, size=9, color="rgba(255, 255, 255, 0.85)"),
                        ],
                    ),
                ],
            ),
        )

    def _trigger_search(self, term: str):
        self.search_input.value = term
        self.search_query = term
        self.page.update()
        self.refresh_content()

    def on_search_change(self, e):
        self.search_query = e.control.value.strip()
        self.refresh_content()

    def refresh_content(self):
        self.results_column.controls.clear()
        q = self.search_query.strip()

        # Toutes les donnees viennent de l'API (meme referentiel que le site web).
        try:
            if q:
                # ---- Mode recherche ----
                entries = api_client.search_medication_availability(q, self.user_lat, self.user_lng)
                meds = [
                    api_object(e.get("medication") or {})
                    for e in (entries or [])
                    if isinstance(e, dict)
                ]
                docs = api_list(
                    api_client.get_doctors(search=q, lat=self.user_lat, lng=self.user_lng)
                )
                pharms = api_list(
                    api_client.get_pharmacies(search=q, lat=self.user_lat, lng=self.user_lng)
                )

                if meds:
                    self.results_column.controls.append(
                        ft.Text(f"Médicaments disponibles ({len(meds)})", size=13, weight=ft.FontWeight.W_800, color="#0F172A")
                    )
                    for m in meds:
                        self.results_column.controls.append(self._build_med_search_card(m))

                if docs:
                    self.results_column.controls.append(
                        ft.Text(f"Médecins spécialistes ({len(docs)})", size=13, weight=ft.FontWeight.W_800, color="#0F172A")
                    )
                    for d in docs:
                        dist = calculate_distance_km(self.user_lat, self.user_lng, d.latitude, d.longitude)
                        self.results_column.controls.append(self._build_web_doctor_card(d, dist))

                if pharms:
                    self.results_column.controls.append(
                        ft.Text(f"Pharmacies ({len(pharms)})", size=13, weight=ft.FontWeight.W_800, color="#0F172A")
                    )
                    for p in pharms:
                        dist = calculate_distance_km(self.user_lat, self.user_lng, p.latitude, p.longitude)
                        self.results_column.controls.append(self._build_web_pharmacy_card(p, dist))

                if not meds and not docs and not pharms:
                    self.results_column.controls.append(
                        ft.Container(
                            padding=ft.Padding.all(28),
                            alignment=ft.Alignment.CENTER,
                            content=ft.Column(
                                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                                spacing=4,
                                controls=[
                                    ft.Icon(ft.Icons.SEARCH_OFF_ROUNDED, size=36, color="#94A3B8"),
                                    ft.Text("Aucun résultat pour cette recherche", size=12, weight=ft.FontWeight.BOLD, color="#64748B"),
                                ],
                            ),
                        )
                    )
            else:
                # ---- Vue par defaut ----
                # 1. Section: Pharmacies de garde & Ouvertes
                pharm_header = ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Text("🌙 Pharmacies de garde & Ouvertes", size=14, weight=ft.FontWeight.W_900, color="#0F172A"),
                        ft.TextButton(
                            "Voir tout >",
                            style=ft.ButtonStyle(color="#047857"),
                            on_click=lambda _: self.on_navigate_tab(1) if self.on_navigate_tab else None,
                        ),
                    ],
                )
                self.results_column.controls.append(pharm_header)

                pharmacies = api_list(
                    api_client.get_pharmacies(lat=self.user_lat, lng=self.user_lng)
                )
                pharm_list = []
                for p in pharmacies:
                    dist = calculate_distance_km(self.user_lat, self.user_lng, p.latitude, p.longitude)
                    pharm_list.append((p, dist))
                pharm_list.sort(key=lambda x: (not x[0].is_on_duty, x[1]))

                for p, dist in pharm_list[:2]:
                    self.results_column.controls.append(self._build_web_pharmacy_card(p, dist))

                # 2. Section: Medecins & Specialistes Disponibles
                doc_header = ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Text("🩺 Médecins & Spécialistes Disponibles", size=14, weight=ft.FontWeight.W_900, color="#0F172A"),
                        ft.TextButton(
                            "Voir tout >",
                            style=ft.ButtonStyle(color="#1D4ED8"),
                            on_click=lambda _: self.on_navigate_tab(2) if self.on_navigate_tab else None,
                        ),
                    ],
                )
                self.results_column.controls.append(doc_header)

                doctors = api_list(
                    api_client.get_doctors(lat=self.user_lat, lng=self.user_lng)
                )
                for d in doctors[:2]:
                    dist = calculate_distance_km(self.user_lat, self.user_lng, d.latitude, d.longitude)
                    self.results_column.controls.append(self._build_web_doctor_card(d, dist))

        except ElamApiError as exc:
            # Message explicite : jamais de donnees fictives
            self.results_column.controls.append(
                ft.Container(
                    padding=ft.Padding.all(20),
                    border_radius=14,
                    bgcolor=MedicalColors.EMERGENCY_LIGHT,
                    border=ft.Border.all(1, MedicalColors.EMERGENCY),
                    content=ft.Column(
                        tight=True,
                        spacing=4,
                        controls=[
                            ft.Text("Données indisponibles", size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.EMERGENCY),
                            ft.Text(exc.message, size=11, color="#64748B"),
                        ],
                    ),
                )
            )

        if self.page:
            self.page.update()

    def _build_web_pharmacy_card(self, p: PharmacyProfile, dist: float):
        duty_badge = ft.Container(
            padding=ft.Padding.symmetric(horizontal=8, vertical=3),
            border_radius=10,
            bgcolor="#FEF3C7" if p.is_on_duty else "#ECFDF5",
            content=ft.Text(
                "🌙 Pharmacie de Garde" if p.is_on_duty else "Ouverte",
                size=10,
                weight=ft.FontWeight.BOLD,
                color="#92400E" if p.is_on_duty else "#047857",
            ),
        )

        return ft.Container(
            padding=ft.Padding.all(16),
            border_radius=20,
            bgcolor="#FFFFFF",
            border=ft.Border.all(1, "#E2E8F0"),
            content=ft.Column(
                spacing=12,
                controls=[
                    # Top Row: Icon + Badge
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Container(
                                width=36,
                                height=36,
                                border_radius=12,
                                bgcolor="#ECFDF5",
                                alignment=ft.Alignment.CENTER,
                                content=ft.Text("💊", size=16),
                            ),
                            duty_badge,
                        ],
                    ),
                    # Pharmacy Info
                    ft.Column(
                        spacing=3,
                        controls=[
                            ft.Text(p.name, size=14, weight=ft.FontWeight.W_900, color="#0F172A"),
                            ft.Row(
                                spacing=4,
                                controls=[
                                    ft.Icon(ft.Icons.LOCATION_ON_ROUNDED, size=13, color="#94A3B8"),
                                    ft.Text(f"{p.district or p.address}", size=11, color="#64748B"),
                                    ft.Text(f"({dist:.1f} km)", size=11, weight=ft.FontWeight.BOLD, color="#047857"),
                                ],
                            ),
                            ft.Row(
                                spacing=4,
                                controls=[
                                    ft.Icon(ft.Icons.ACCESS_TIME_ROUNDED, size=13, color="#94A3B8"),
                                    ft.Text(p.opening_hours or "08h00 - 20h00", size=11, color="#64748B"),
                                ],
                            ),
                        ],
                    ),
                    # Bottom Divider & Buttons
                    ft.Container(
                        padding=ft.Padding.only(top=10),
                        border=ft.Border.only(top=ft.BorderSide(1, "#F1F5F9")),
                        content=ft.Row(
                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                            controls=[
                                ft.OutlinedButton(
                                    "Appeler",
                                    style=ft.ButtonStyle(
                                        shape=ft.RoundedRectangleBorder(radius=10),
                                        padding=ft.Padding.symmetric(horizontal=14, vertical=6),
                                    ),
                                    on_click=lambda _, ph=p.phone: show_toast(self.page, f"📞 Appel vers {ph}...", "#059669"),
                                ),
                                ft.ElevatedButton(
                                    "Voir les stocks",
                                    bgcolor="#059669",
                                    color="#FFFFFF",
                                    style=ft.ButtonStyle(
                                        shape=ft.RoundedRectangleBorder(radius=10),
                                        padding=ft.Padding.symmetric(horizontal=14, vertical=6),
                                    ),
                                    on_click=lambda _: self._open_first_med_modal(),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
        )

    def _build_web_doctor_card(self, d: DoctorProfile, dist: float):
        doc_name = f"{d.title} {d.user.first_name} {d.user.last_name}" if d.user else "Dr. Spécialiste"
        initials = f"{d.user.first_name[0]}{d.user.last_name[0]}" if d.user else "DR"

        return ft.Container(
            padding=ft.Padding.all(16),
            border_radius=20,
            bgcolor="#FFFFFF",
            border=ft.Border.all(1, "#E2E8F0"),
            content=ft.Column(
                spacing=12,
                controls=[
                    # Top Row: Avatar + Price
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Container(
                                width=40,
                                height=40,
                                border_radius=14,
                                gradient=ft.LinearGradient(
                                    colors=["#3B82F6", "#2DD4BF"],
                                    begin=ft.Alignment.TOP_LEFT,
                                    end=ft.Alignment.BOTTOM_RIGHT,
                                ),
                                alignment=ft.Alignment.CENTER,
                                content=ft.Text(initials, size=13, weight=ft.FontWeight.W_900, color="white"),
                            ),
                            ft.Column(
                                horizontal_alignment=ft.CrossAxisAlignment.END,
                                spacing=1,
                                controls=[
                                    ft.Text(f"{d.consultation_fee:,} FCFA".replace(",", " "), size=12, weight=ft.FontWeight.W_900, color="#0F172A"),
                                    ft.Container(
                                        padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                                        border_radius=4,
                                        bgcolor="#ECFDF5",
                                        content=ft.Text("CNAMGS ✓", size=9, weight=ft.FontWeight.BOLD, color="#047857"),
                                    ),
                                ],
                            ),
                        ],
                    ),
                    # Doctor Info
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Row(
                                spacing=4,
                                controls=[
                                    ft.Text(docName := doc_name, size=14, weight=ft.FontWeight.W_900, color="#0F172A"),
                                    ft.Container(
                                        padding=ft.Padding.symmetric(horizontal=5, vertical=1),
                                        border_radius=4,
                                        bgcolor="#DCFCE7",
                                        content=ft.Text("✓", size=9, weight=ft.FontWeight.BOLD, color="#166534"),
                                    ),
                                ],
                            ),
                            ft.Text(d.specialty, size=12, weight=ft.FontWeight.BOLD, color="#1D4ED8"),
                            ft.Row(
                                spacing=4,
                                controls=[
                                    ft.Icon(ft.Icons.LOCATION_ON_ROUNDED, size=13, color="#94A3B8"),
                                    ft.Text(f"{d.district or d.address}", size=11, color="#64748B"),
                                    ft.Text(f"({dist:.1f} km)", size=11, weight=ft.FontWeight.BOLD, color="#1D4ED8"),
                                ],
                            ),
                        ],
                    ),
                    # Bottom Divider & Booking
                    ft.Container(
                        padding=ft.Padding.only(top=10),
                        border=ft.Border.only(top=ft.BorderSide(1, "#F1F5F9")),
                        content=ft.Row(
                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                            controls=[
                                ft.Text("★ 4.9", size=11, weight=ft.FontWeight.BOLD, color="#64748B"),
                                ft.ElevatedButton(
                                    "Prendre RDV",
                                    icon=ft.Icons.CALENDAR_MONTH_ROUNDED,
                                    bgcolor="#2563EB",
                                    color="#FFFFFF",
                                    style=ft.ButtonStyle(
                                        shape=ft.RoundedRectangleBorder(radius=10),
                                        padding=ft.Padding.symmetric(horizontal=14, vertical=6),
                                    ),
                                    on_click=lambda _, doc_obj=d: DoctorBookingModal(
                                        self.page,
                                        doc_obj,
                                        on_success=lambda: self.on_navigate_tab(4) if self.on_navigate_tab else None,
                                    ).show(),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
        )

    def _build_med_search_card(self, med: Medication):
        return ft.Container(
            padding=ft.Padding.all(14),
            border_radius=16,
            bgcolor="#FFFFFF",
            border=ft.Border.all(1, "#E2E8F0"),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Row(
                        spacing=10,
                        controls=[
                            ft.Container(
                                width=36,
                                height=36,
                                border_radius=12,
                                bgcolor="#ECFDF5",
                                alignment=ft.Alignment.CENTER,
                                content=ft.Text("💊", size=16),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text(med.name, size=13, weight=ft.FontWeight.W_900, color="#0F172A"),
                                    ft.Text(f"{med.generic_name} • {med.form} ({med.dosage})", size=10, color="#64748B"),
                                ],
                            ),
                        ],
                    ),
                    ft.ElevatedButton(
                        "Stocks",
                        bgcolor="#059669",
                        color="#FFFFFF",
                        style=ft.ButtonStyle(
                            shape=ft.RoundedRectangleBorder(radius=10),
                            padding=ft.Padding.symmetric(horizontal=12, vertical=6),
                        ),
                        on_click=lambda _, m=med: MedicationAvailabilityModal(self.page, m, self.user_lat, self.user_lng).show(),
                    ),
                ],
            ),
        )

    def _open_first_med_modal(self):
        try:
            medications = api_list(api_client.list_medications())
        except ElamApiError as exc:
            show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
            return
        if not medications:
            show_toast(self.page, "Catalogue de médicaments vide.", MedicalColors.WARNING)
            return
        MedicationAvailabilityModal(self.page, medications[0], self.user_lat, self.user_lng).show()
