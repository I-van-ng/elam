import flet as ft
from theme.colors import MedicalColors, MedicalStyles
from utils.ui import show_toast, open_modal, close_modal
from utils.geo import calculate_distance_km, format_travel_info
from data.models import Medication
from services.api_client import api_client, ElamApiError
from services.api_models import stock_offers_from_api
from components.payment_modal import MobileMoneyPaymentModal


class MedicationAvailabilityModal:
    """Python/Flet port of MedicationAvailabilityModal from Web Frontend.

    Lit la disponibilite reelle via GET /pharmacies/medications/search et cree la
    reservation via POST /pharmacies/reservations (plus aucune ecriture SQLite).
    """

    def __init__(self, page: ft.Page, medication: Medication, user_lat=0.5182, user_lng=9.4215):
        self.page = page
        self.medication = medication
        self.user_lat = user_lat
        self.user_lng = user_lng
        self.dialog = None
        # Identifiant BACKEND du medicament, recupere a la recherche : c'est lui
        # qu'il faut transmettre pour reserver (les ids locaux ne sont pas connus
        # du serveur).
        self.medication_id = None

    # ------------------------------------------------------------------ donnees
    def _pick_entry(self, results):
        """Retrouve l'entree correspondant au medicament demande."""
        entries = [r for r in (results or []) if isinstance(r, dict)]
        if not entries:
            return None
        wanted = (getattr(self.medication, "name", "") or "").strip().lower()
        for entry in entries:
            med = entry.get("medication") or {}
            if (med.get("name") or "").strip().lower() == wanted:
                return entry
        return entries[0]

    # ------------------------------------------------------------------ rendu
    def show(self):
        try:
            results = api_client.search_medication_availability(
                self.medication.name, self.user_lat, self.user_lng
            )
        except ElamApiError as exc:
            show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
            return

        entry = self._pick_entry(results)
        if entry:
            medication = entry.get("medication") or {}
            self.medication_id = medication.get("id")
            offers = stock_offers_from_api(entry.get("offers"), self.medication_id)
        else:
            offers = []

        offers_controls = []
        if not offers:
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
            for offer in offers:
                offers_controls.append(self._build_offer_card(offer))

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
                            ft.Text(f"Officines avec stock ({len(offers)})", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_MUTED),
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

    def _build_offer_card(self, offer):
        pharmacy = offer.pharmacy

        # L'API fournit deja la distance ; on ne recalcule qu'en dernier recours.
        dist = offer.distance_km
        if dist is None and getattr(pharmacy, "latitude", None) is not None:
            dist = calculate_distance_km(
                self.user_lat, self.user_lng, pharmacy.latitude, pharmacy.longitude
            )
        distance_label = format_travel_info(dist) if dist is not None else "distance inconnue"

        status = offer.status
        is_available = status == "IN_STOCK"
        is_low = status == "LOW_STOCK"
        status_text = "En stock (Disponible)" if is_available else ("Stock faible" if is_low else "Rupture temporaire")
        status_color = MedicalColors.SUCCESS if is_available else (MedicalColors.WARNING if is_low else MedicalColors.EMERGENCY)
        status_bg = MedicalColors.SUCCESS_BG if is_available else (MedicalColors.WARNING_BG if is_low else MedicalColors.EMERGENCY_LIGHT)

        return ft.Container(
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
                                            ft.Text(pharmacy.name, size=13, weight=ft.FontWeight.W_800, color=MedicalColors.TEXT_PRIMARY),
                                            ft.Container(
                                                padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                                                border_radius=10,
                                                bgcolor=MedicalColors.DUTY_LIGHT if pharmacy.is_on_duty else MedicalColors.PRIMARY_LIGHT,
                                                content=ft.Text(
                                                    "🌙 Garde" if pharmacy.is_on_duty else "Ouverte",
                                                    size=9,
                                                    weight=ft.FontWeight.BOLD,
                                                    color=MedicalColors.DUTY_GOLD if pharmacy.is_on_duty else MedicalColors.PRIMARY_DARK,
                                                ),
                                            ),
                                        ],
                                    ),
                                    ft.Text(f"📍 {pharmacy.district or pharmacy.address} ({distance_label})", size=11, color=MedicalColors.TEXT_SECONDARY),
                                ],
                            ),
                            ft.Text(f"{offer.price_fcfa:,} FCFA".replace(",", " "), size=13, weight=ft.FontWeight.W_900, color=MedicalColors.PRIMARY_DARK),
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
                                "Payer & réserver",
                                icon=ft.Icons.PAYMENT_ROUNDED,
                                bgcolor=MedicalColors.PRIMARY,
                                color="#FFFFFF",
                                style=ft.ButtonStyle(
                                    shape=ft.RoundedRectangleBorder(radius=10),
                                    padding=ft.Padding.symmetric(horizontal=12, vertical=6),
                                ),
                                on_click=lambda _, offer_item=offer: self._reserve_medication(offer_item),
                            ),
                        ],
                    ),
                ],
            ),
        )

    # ------------------------------------------------------------------ action
    def _reserve_medication(self, offer):
        if not api_client.is_authenticated:
            show_toast(self.page, "Connectez-vous pour réserver un médicament.", MedicalColors.EMERGENCY)
            return

        medication_id = self.medication_id or getattr(offer, "medication_id", None)
        if not medication_id:
            show_toast(
                self.page,
                "Médicament introuvable dans le référentiel central.",
                MedicalColors.EMERGENCY,
            )
            return

        try:
            reservation = api_client.create_reservation(
                pharmacy_id=offer.pharmacy_id,
                medication_id=medication_id,
                quantity=1,
                notes="Réservation initiée depuis l'application mobile ELAM.",
            )
        except ElamApiError as exc:
            show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
            return

        reservation_id = reservation.get("id")
        close_modal(self.page, self.dialog)
        show_toast(
            self.page,
            "Réservation enregistrée. Finalisez le paiement mobile money pour confirmer.",
            MedicalColors.PRIMARY,
        )

        def after_payment(_payment_info=None):
            show_toast(
                self.page,
                f"✅ 1 boîte de {self.medication.name} payée et confirmée à la {offer.pharmacy.name}.",
                MedicalColors.SUCCESS,
            )

        MobileMoneyPaymentModal(
            page=self.page,
            title="Paiement Mobile Money",
            service_name=f"Réservation {self.medication.name}",
            total_amount=offer.price_fcfa,
            is_cnamgs_eligible=offer.pharmacy.accepts_cnamgs,
            related_to="RESERVATION",
            related_id=reservation_id,
            on_success=after_payment,
        ).show()
