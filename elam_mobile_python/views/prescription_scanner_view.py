import datetime
import flet as ft
from theme.colors import MedicalColors
from utils.geo import calculate_distance_km, format_travel_info
from utils.ui import show_toast, open_modal, close_modal
from data.database import SessionLocal
from data.models import PharmacyProfile, Medication, PharmacyStock, MedicationReservation, User, PatientProfile
from components.payment_modal import MobileMoneyPaymentModal


DEMO_PRESCRIPTIONS = [
    {
        "id": "rx_palu",
        "title": "Fièvre & Suspicion Paludisme",
        "doctor": "Dr. Sylvie Nzamba (Pédiatrie / Urgences)",
        "date": "12/09/2026",
        "meds": [
            {"name": "Coartem 80/480mg", "dosage": "80/480mg", "qty": 1, "posology": "1 comprimé matin et soir pendant 3 jours", "code": "CNAMGS-MED-044"},
            {"name": "Doliprane 1000mg", "dosage": "1000mg", "qty": 2, "posology": "1 comprimé toutes les 6 heures si fièvre", "code": "CNAMGS-MED-001"},
        ],
    },
    {
        "id": "rx_orl",
        "title": "Infection Respiratoire / Angine",
        "doctor": "Dr. Christian Bekale (Médecine Générale)",
        "date": "11/09/2026",
        "meds": [
            {"name": "Amoxicilline 500mg", "dosage": "500mg", "qty": 2, "posology": "1 gélule 3 fois par jour pendant 7 jours", "code": "CNAMGS-MED-012"},
            {"name": "Doliprane 1000mg", "dosage": "1000mg", "qty": 1, "posology": "1 comprimé en cas de céphalées ou courbatures", "code": "CNAMGS-MED-001"},
        ],
    },
    {
        "id": "rx_asthme",
        "title": "Crise d'Asthme & Bronchite",
        "doctor": "Dr. Alain Minko (Cardiologie & Vasculaire)",
        "date": "10/09/2026",
        "meds": [
            {"name": "Ventoline 100µg", "dosage": "100µg", "qty": 1, "posology": "2 bouffées en cas de gêne respiratoire", "code": "CNAMGS-MED-035"},
            {"name": "Amoxicilline 500mg", "dosage": "500mg", "qty": 1, "posology": "1 gélule matin et soir", "code": "CNAMGS-MED-012"},
        ],
    },
]


class PrescriptionScannerView:
    def __init__(self, page: ft.Page, on_back=None):
        self.page = page
        self.on_back = on_back
        self.user_lat = 0.5182
        self.user_lng = 9.4215
        self.current_rx = None
        self.is_scanning = False
        self.results_container = ft.Column(spacing=12)

    def build(self):
        header = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=12),
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.only(bottom=ft.BorderSide(1, MedicalColors.BORDER)),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Row(
                        spacing=8,
                        controls=[
                            ft.IconButton(
                                ft.Icons.ARROW_BACK,
                                icon_color=MedicalColors.TEXT_PRIMARY,
                                on_click=lambda _: self.on_back() if self.on_back else None,
                            ),
                            ft.Column(
                                spacing=0,
                                controls=[
                                    ft.Text("Scanner d'Ordonnance IA", size=16, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                                    ft.Text("OCR Intelligent & Recherche Stocks 🇬🇦", size=11, color=MedicalColors.PRIMARY),
                                ],
                            ),
                        ],
                    ),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                        border_radius=10,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Text("IA V2.4", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                    ),
                ],
            ),
        )

        scan_banner = ft.Container(
            padding=ft.Padding.all(16),
            border_radius=14,
            gradient=ft.LinearGradient(
                colors=[MedicalColors.PRIMARY_DARK, "#14532D"],
            ),
            content=ft.Column(
                spacing=8,
                controls=[
                    ft.Row(
                        spacing=10,
                        controls=[
                            ft.Icon(ft.Icons.DOCUMENT_SCANNER, color="white", size=32),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text("Numérisez votre ordonnance", size=15, weight=ft.FontWeight.BOLD, color="white"),
                                    ft.Text("L'IA identifie les médicaments et localise les pharmacies.", size=11, color="#BBF7D0"),
                                ],
                            ),
                        ],
                    ),
                ],
            ),
        )

        # Quick preset selection cards
        preset_title = ft.Text("Ou testez avec une ordonnance type :", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY)
        preset_cards = ft.Column(
            spacing=8,
            controls=[
                self._build_preset_card(rx) for rx in DEMO_PRESCRIPTIONS
            ],
        )

        camera_button = ft.ElevatedButton(
            "Prendre une photo de l'ordonnance 📸",
            icon=ft.Icons.CAMERA_ALT,
            bgcolor=MedicalColors.PRIMARY,
            color="white",
            style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=12), padding=ft.Padding.all(14)),
            on_click=lambda _: self._trigger_scan(DEMO_PRESCRIPTIONS[0]),
        )

        return ft.Column(
            expand=True,
            spacing=0,
            controls=[
                header,
                ft.Container(
                    expand=True,
                    padding=ft.Padding.all(16),
                    content=ft.Column(
                        expand=True,
                        scroll=ft.ScrollMode.ADAPTIVE,
                        spacing=14,
                        controls=[
                            scan_banner,
                            camera_button,
                            preset_title,
                            preset_cards,
                            ft.Divider(color=MedicalColors.BORDER),
                            self.results_container,
                        ],
                    ),
                ),
            ],
        )

    def _build_preset_card(self, rx):
        return ft.Container(
            padding=ft.Padding.all(12),
            border_radius=10,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            on_click=lambda _, r=rx: self._trigger_scan(r),
            ink=True,
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text(rx["title"], size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text(f"{rx['doctor']} • {len(rx['meds'])} molécules prescrites", size=11, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Icon(ft.Icons.ARROW_FORWARD_IOS, size=14, color=MedicalColors.PRIMARY),
                ],
            ),
        )

    def _trigger_scan(self, rx):
        self.current_rx = rx
        self.results_container.controls.clear()

        # Step 1: Show scanning animation
        scan_progress = ft.Container(
            padding=ft.Padding.all(16),
            border_radius=12,
            bgcolor=MedicalColors.PRIMARY_LIGHT,
            border=ft.Border.all(1, MedicalColors.PRIMARY),
            content=ft.Column(
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=8,
                controls=[
                    ft.ProgressBar(color=MedicalColors.PRIMARY, bgcolor=MedicalColors.BORDER),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.CENTER,
                        spacing=8,
                        controls=[
                            ft.Icon(ft.Icons.AUTO_AWESOME, color=MedicalColors.PRIMARY, size=18),
                            ft.Text("Analyse OCR & Recherche de stocks en direct...", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                        ],
                    ),
                ],
            ),
        )
        self.results_container.controls.append(scan_progress)
        self.page.update()

        # Step 2: Render results
        self._render_scan_results(rx)

    def _render_scan_results(self, rx):
        self.results_container.controls.clear()

        # 1. Extracted Medicines Card
        med_rows = []
        for m in rx["meds"]:
            med_rows.append(
                ft.Container(
                    padding=ft.Padding.all(10),
                    border_radius=8,
                    bgcolor=MedicalColors.BACKGROUND,
                    content=ft.Column(
                        spacing=2,
                        controls=[
                            ft.Row(
                                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                controls=[
                                    ft.Text(m["name"], size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                                    ft.Container(
                                        padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                                        border_radius=6,
                                        bgcolor=MedicalColors.SUCCESS_BG,
                                        content=ft.Text(m["code"], size=9, weight=ft.FontWeight.BOLD, color=MedicalColors.SUCCESS),
                                    ),
                                ],
                            ),
                            ft.Text(f"Posologie : {m['posology']}", size=11, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                )
            )

        extracted_card = ft.Container(
            padding=ft.Padding.all(14),
            border_radius=12,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.PRIMARY),
            content=ft.Column(
                spacing=10,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=6,
                                controls=[
                                    ft.Icon(ft.Icons.CHECK_CIRCLE, color=MedicalColors.SUCCESS, size=18),
                                    ft.Text("Médicaments Détectés par l'IA", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                                ],
                            ),
                            ft.Text(f"{len(rx['meds'])} trouvés", size=11, color=MedicalColors.PRIMARY, weight=ft.FontWeight.BOLD),
                        ],
                    ),
                    ft.Column(spacing=6, controls=med_rows),
                ],
            ),
        )

        # 2. Multi-Pharmacy Matching
        db = SessionLocal()
        pharmacies_matching = []
        try:
            pharmacies = db.query(PharmacyProfile).all()
            for p in pharmacies:
                dist = calculate_distance_km(self.user_lat, self.user_lng, p.latitude, p.longitude)
                travel = format_travel_info(dist)

                # Check stocks for each med in rx
                available_count = 0
                total_cost = 0
                for m in rx["meds"]:
                    med_obj = db.query(Medication).filter(Medication.name.ilike(f"%{m['name'].split()[0]}%")).first()
                    if med_obj:
                        stock = db.query(PharmacyStock).filter(
                            PharmacyStock.pharmacy_id == p.id,
                            PharmacyStock.medication_id == med_obj.id,
                            PharmacyStock.status.in_(["IN_STOCK", "LOW_STOCK"]),
                        ).first()
                        if stock:
                            available_count += 1
                            total_cost += stock.price_fcfa * m.get("qty", 1)
                        else:
                            total_cost += 3500 * m.get("qty", 1)
                    else:
                        total_cost += 3500 * m.get("qty", 1)

                match_pct = int((available_count / len(rx["meds"])) * 100) if rx["meds"] else 0
                pharmacies_matching.append({
                    "pharmacy": p,
                    "dist": dist,
                    "travel": travel,
                    "match_pct": match_pct,
                    "available_count": available_count,
                    "total_meds": len(rx["meds"]),
                    "total_cost": total_cost or (3500 * len(rx["meds"])),
                })
        finally:
            db.close()

        # Sort by match percentage desc, then distance asc
        pharmacies_matching.sort(key=lambda x: (-x["match_pct"], x["dist"]))

        pharmacy_cards = []
        for match in pharmacies_matching:
            p = match["pharmacy"]
            is_full = match["match_pct"] == 100
            badge_bg = MedicalColors.SUCCESS_BG if is_full else MedicalColors.WARNING_BG
            badge_color = MedicalColors.SUCCESS if is_full else MedicalColors.WARNING

            def on_reserve_all(pharm_info=match):
                self._open_group_reservation_modal(rx, pharm_info)

            pharmacy_cards.append(
                ft.Container(
                    padding=ft.Padding.all(12),
                    border_radius=12,
                    bgcolor=MedicalColors.CARD_BG,
                    border=ft.Border.all(1, MedicalColors.PRIMARY if is_full else MedicalColors.BORDER),
                    content=ft.Column(
                        spacing=8,
                        controls=[
                            ft.Row(
                                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                controls=[
                                    ft.Column(
                                        spacing=2,
                                        controls=[
                                            ft.Text(p.name, size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                                            ft.Text(f"📍 {p.district} • {match['travel']}", size=11, color=MedicalColors.TEXT_SECONDARY),
                                        ],
                                    ),
                                    ft.Container(
                                        padding=ft.Padding.symmetric(horizontal=8, vertical=3),
                                        border_radius=8,
                                        bgcolor=badge_bg,
                                        content=ft.Text(f"{match['available_count']}/{match['total_meds']} en stock ({match['match_pct']}%)", size=10, weight=ft.FontWeight.BOLD, color=badge_color),
                                    ),
                                ],
                            ),
                            ft.Row(
                                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                controls=[
                                    ft.Text(f"Estimation : {match['total_cost']:,} FCFA".replace(",", " "), size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                    ft.ElevatedButton(
                                        "Réserver & Payer le Panier 🇬🇦",
                                        icon=ft.Icons.SHOPPING_BAG,
                                        bgcolor=MedicalColors.PRIMARY if is_full else MedicalColors.TEXT_SECONDARY,
                                        color="white",
                                        style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=8), padding=ft.Padding.symmetric(horizontal=10, vertical=6)),
                                        on_click=lambda _, pi=match: on_reserve_all(pi),
                                    ),
                                ],
                            ),
                        ],
                    ),
                )
            )

        match_section = ft.Column(
            spacing=8,
            controls=[
                ft.Text("Pharmacies recommandées pour cette ordonnance :", size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                *pharmacy_cards,
            ],
        )

        self.results_container.controls.extend([extracted_card, match_section])
        self.page.update()

    def _open_group_reservation_modal(self, rx, pharm_info):
        pharm = pharm_info["pharmacy"]
        total_cost = pharm_info["total_cost"]

        pay_modal = MobileMoneyPaymentModal(
            page=self.page,
            title="Réservation Ordonnance Complète",
            service_name=f"Panier Ordonnance ({len(rx['meds'])} méd.) — {pharm.name}",
            total_amount=total_cost,
            is_cnamgs_eligible=pharm.accepts_cnamgs,
            related_to="RESERVATION",
            on_success=lambda _: show_toast(self.page, f"✅ Ordonnance transmise et réservée à la {pharm.name} !", MedicalColors.SUCCESS),
        )
        pay_modal.show()
