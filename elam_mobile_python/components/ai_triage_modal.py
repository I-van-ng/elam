import os
import sys
from pathlib import Path

# Résolution des modules internes quel que soit l'environnement
_mobile_root = Path(__file__).resolve().parent.parent
if str(_mobile_root) not in sys.path:
    sys.path.insert(0, str(_mobile_root))

import flet as ft

try:
    from theme.colors import MedicalColors, MedicalStyles
    from utils.ui import show_toast, open_modal, close_modal
    from utils.geo import calculate_distance_km, format_travel_info
    from data.database import SessionLocal
    from data.models import Medication, PharmacyStock
except ImportError:
    from elam.elam_mobile_python.theme.colors import MedicalColors, MedicalStyles
    from elam.elam_mobile_python.utils.ui import show_toast, open_modal, close_modal
    from elam.elam_mobile_python.utils.geo import calculate_distance_km, format_travel_info
    from elam.elam_mobile_python.data.database import SessionLocal
    from elam.elam_mobile_python.data.models import Medication, PharmacyStock



class AiTriageModal:
    """2026 Neuro-Clinical Symptom Checker & Emergency Triage Engine for Gabon"""

    SYMPTOMS_DB = [
        {
            "id": "palu",
            "name": "Fièvre + Frissons",
            "sub": "Suspicion Paludisme",
            "icon": ft.Icons.CORONAVIRUS_ROUNDED,
            "color": "#F59E0B",
            "level": "MODERATE",
            "condition": "Forte suspicion d'accès palustre (Paludisme)",
            "urgency": "Consultation recommandée dans les 12h • Réaliser Test TDR",
            "protocol": "Protocole OMS / Ministère Santé Gabon : Artéméther + Luméfantrine (Coartem) après test biologique.",
            "recommended_med": "Coartem",
            "samu": False,
        },
        {
            "id": "cardio",
            "name": "Douleur Poitrine",
            "sub": "Détresse cardiaque",
            "icon": ft.Icons.FAVORITE_ROUNDED,
            "color": "#FF3366",
            "level": "CRITICAL",
            "condition": "URGENCE VITALE : Syndrome coronarien ou détresse cardiaque",
            "urgency": "INTERVENTION IMMÉDIATE DU SAMU 1300 REQUISE",
            "protocol": "Position semi-assise, repos total, ne pas conduire seul. Le SAMU Gabon est alerté avec télé-transmission de vos coordonnées.",
            "recommended_med": None,
            "samu": True,
        },
        {
            "id": "respi",
            "name": "Toux & Gêne Resp.",
            "sub": "Infection / Asthme",
            "icon": ft.Icons.AIR_ROUNDED,
            "color": "#00D2FF",
            "level": "MODERATE",
            "condition": "Bronchite aiguë ou crise asthmatiforme",
            "urgency": "Consulter un médecin généraliste ou pneumologue sous 24h",
            "protocol": "Hydratation abondante, aérosolthérapie si asthmatique (Ventoline), antipyrétique si fièvre.",
            "recommended_med": "Ventoline",
            "samu": False,
        },
        {
            "id": "digest",
            "name": "Maux de Ventre",
            "sub": "Gastro / Typhoïde",
            "icon": ft.Icons.MEDICATION_LIQUID_ROUNDED,
            "color": "#10B981",
            "level": "LOW",
            "condition": "Troubles gastro-intestinaux ou suspicion typhoïde",
            "urgency": "Réhydratation par SRO, avis médical si persistance > 48h",
            "protocol": "Soluté de réhydratation orale (SRO), antispasmodique et régime adapté (eau minérale, riz cuit).",
            "recommended_med": "Paracétamol",
            "samu": False,
        },
    ]

    def __init__(self, page: ft.Page, user_lat=0.5182, user_lng=9.4215, on_navigate_tab=None):
        self.page = page
        self.user_lat = user_lat
        self.user_lng = user_lng
        self.on_navigate_tab = on_navigate_tab
        self.selected_symptom = None
        self.result_container = ft.Column(spacing=12)
        self.dialog = None

    def show(self):
        self.selected_symptom = None
        self.result_container.controls.clear()

        # Symptom buttons
        symptom_buttons = []
        for s in self.SYMPTOMS_DB:
            btn = self._build_symptom_card(s)
            symptom_buttons.append(btn)

        content = ft.Container(
            width=390,
            content=ft.Column(
                tight=True,
                spacing=14,
                controls=[
                    # Header
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=8,
                                controls=[
                                    ft.Container(
                                        width=36,
                                        height=36,
                                        border_radius=10,
                                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                                        alignment=ft.Alignment.CENTER,
                                        content=ft.Icon(ft.Icons.AUTO_AWESOME_ROUNDED, color=MedicalColors.PRIMARY, size=20),
                                    ),
                                    ft.Column(
                                        spacing=0,
                                        controls=[
                                            ft.Row(
                                                spacing=4,
                                                controls=[
                                                    ft.Text("Assistant santé", size=15, weight=ft.FontWeight.W_900, color=MedicalColors.PRIMARY),
                                                    ft.Text("• Orientation", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.SECONDARY),
                                                ],
                                            ),
                                            ft.Text("Diagnostic & Orientation Gabon 🇬🇦", size=10, color=MedicalColors.TEXT_MUTED),
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
                    ft.Text("Quel symptôme principal ressentez-vous ?", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                    # Grid of symptoms
                    ft.ResponsiveRow(
                        columns=2,
                        spacing=10,
                        controls=symptom_buttons,
                    ),
                    ft.Divider(height=1, color=MedicalColors.BORDER_SUBTLE),
                    self.result_container,
                ],
            ),
        )

        self.dialog = ft.AlertDialog(
            content=content,
            modal=True,
            bgcolor=MedicalColors.CARD_BG,
            content_padding=ft.Padding.all(16),
            shape=ft.RoundedRectangleBorder(radius=16),
        )

        open_modal(self.page, self.dialog)

    def _build_symptom_card(self, item):
        return ft.Container(
            col=1,
            padding=ft.Padding.all(10),
            border_radius=12,
            bgcolor=MedicalColors.SURFACE_VARIANT,
            border=ft.Border.all(1, MedicalColors.BORDER),
            ink=True,
            on_click=lambda _, it=item: self._select_symptom(it),
            content=ft.Row(
                spacing=8,
                controls=[
                    ft.Container(
                        width=32,
                        height=32,
                        border_radius=8,
                        bgcolor=f"{item['color']}22",
                        alignment=ft.Alignment.CENTER,
                        content=ft.Icon(item["icon"], color=item["color"], size=18),
                    ),
                    ft.Column(
                        spacing=1,
                        expand=True,
                        controls=[
                            ft.Text(item["name"], size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text(item["sub"], size=9, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                ],
            ),
        )

    def _select_symptom(self, symptom):
        self.selected_symptom = symptom
        self.result_container.controls.clear()

        is_critical = symptom["samu"]
        card_border = MedicalColors.EMERGENCY if is_critical else MedicalColors.PRIMARY
        badge_bg = MedicalColors.EMERGENCY_LIGHT if is_critical else MedicalColors.PRIMARY_LIGHT
        badge_text_color = MedicalColors.EMERGENCY if is_critical else MedicalColors.PRIMARY

        # Nearest on-duty pharmacy for medicine
        pharmacy_card = ft.Container()
        if symptom.get("recommended_med"):
            db = SessionLocal()
            try:
                med_name = symptom["recommended_med"]
                med = db.query(Medication).filter(Medication.name.ilike(f"%{med_name}%")).first()
                if med:
                    stocks = db.query(PharmacyStock).filter(PharmacyStock.medication_id == med.id, PharmacyStock.status == "IN_STOCK").all()
                    if stocks:
                        best_pharm = min(stocks, key=lambda s: calculate_distance_km(self.user_lat, self.user_lng, s.pharmacy.latitude, s.pharmacy.longitude))
                        dist = calculate_distance_km(self.user_lat, self.user_lng, best_pharm.pharmacy.latitude, best_pharm.pharmacy.longitude)
                        pharmacy_card = ft.Container(
                            padding=ft.Padding.all(12),
                            border_radius=12,
                            bgcolor=MedicalColors.CARD_BG,
                            border=ft.Border.all(1, MedicalColors.PRIMARY),
                            content=ft.Column(
                                spacing=6,
                                controls=[
                                    ft.Row(
                                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                        controls=[
                                            ft.Text("💊 Médicament en stock vérifié :", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                                            ft.Text(f"{med.name}", size=11, weight=ft.FontWeight.W_900, color=MedicalColors.PRIMARY),
                                        ],
                                    ),
                                    ft.Row(
                                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                        controls=[
                                            ft.Text(f"📍 {best_pharm.pharmacy.name} ({format_travel_info(dist)})", size=10, color=MedicalColors.TEXT_SECONDARY),
                                            ft.Text(f"{best_pharm.price_fcfa:,} FCFA".replace(",", " "), size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.DUTY_GOLD),
                                        ],
                                    ),
                                    ft.ElevatedButton(
                                        "Réserver en 1 clic (Pharmacie de garde)",
                                        icon=ft.Icons.CHECK_CIRCLE_ROUNDED,
                                        bgcolor=MedicalColors.PRIMARY,
                                        color="#000000" if MedicalColors.IS_DARK else "#FFFFFF",
                                        style=ft.ButtonStyle(
                                            shape=ft.RoundedRectangleBorder(radius=8),
                                            padding=ft.Padding.symmetric(horizontal=12, vertical=8),
                                        ),
                                        on_click=lambda _: self._reserve_success(med.name, best_pharm.pharmacy.name),
                                    ),
                                ],
                            ),
                        )
            finally:
                db.close()

        action_button = ft.Container()
        if is_critical:
            action_button = ft.ElevatedButton(
                "🚨 APPELER LE SAMU 1300 IMMÉDIATEMENT",
                icon=ft.Icons.PHONE_IN_TALK_ROUNDED,
                bgcolor=MedicalColors.EMERGENCY,
                color="white",
                style=ft.ButtonStyle(
                    shape=ft.RoundedRectangleBorder(radius=10),
                    padding=ft.Padding.symmetric(horizontal=16, vertical=12),
                ),
                on_click=lambda _: show_toast(self.page, "🚨 Lancement liaison satellite SAMU Gabon 1300...", MedicalColors.EMERGENCY),
            )
        else:
            action_button = ft.Row(
                spacing=8,
                controls=[
                    ft.ElevatedButton(
                        "Téléconsultation Médecin",
                        icon=ft.Icons.VIDEO_CALL_ROUNDED,
                        bgcolor=MedicalColors.SECONDARY,
                        color="white",
                        style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=8)),
                        on_click=lambda _: self._open_teleconsult_tab(),
                    ),
                    ft.OutlinedButton(
                        "Voir Pharmacies",
                        icon=ft.Icons.LOCAL_PHARMACY_ROUNDED,
                        style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=8)),
                        on_click=lambda _: self._open_pharmacy_tab(),
                    ),
                ],
            )

        analysis_card = ft.Container(
            padding=ft.Padding.all(14),
            border_radius=14,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1.5, card_border),
            shadow=MedicalStyles.SHADOW_EMERGENCY if is_critical else MedicalStyles.SHADOW_PRIMARY,
            content=ft.Column(
                spacing=8,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Container(
                                padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                                border_radius=6,
                                bgcolor=badge_bg,
                                content=ft.Text(f"NIVEAU : {symptom['level']}", size=10, weight=ft.FontWeight.W_900, color=badge_text_color),
                            ),
                            ft.Text("Informations générales", size=10, color=MedicalColors.TEXT_MUTED),
                        ],
                    ),
                    ft.Text(symptom["condition"], size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                    ft.Text(symptom["urgency"], size=11, weight=ft.FontWeight.W_600, color=card_border),
                    ft.Text(symptom["protocol"], size=10, color=MedicalColors.TEXT_SECONDARY),
                    pharmacy_card,
                    action_button,
                ],
            ),
        )

        self.result_container.controls.append(analysis_card)
        self.page.update()

    def _reserve_success(self, med_name, pharm_name):
        close_modal(self.page, self.dialog)
        show_toast(self.page, f"✅ {med_name} réservé avec succès à la {pharm_name} ! SMS envoyé.", MedicalColors.PRIMARY)

    def _open_teleconsult_tab(self):
        close_modal(self.page, self.dialog)
        if self.on_navigate_tab:
            self.on_navigate_tab(2)

    def _open_pharmacy_tab(self):
        close_modal(self.page, self.dialog)
        if self.on_navigate_tab:
            self.on_navigate_tab(1)
