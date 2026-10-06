import uuid
import datetime
import flet as ft
from theme.colors import MedicalColors
from utils.ui import open_modal, close_modal, show_toast
from data.database import SessionLocal
from data.models import Payment, Appointment, MedicationReservation
from services.api_client import api_client


def detect_operator(phone: str):
    cleaned = "".join(filter(str.isdigit, phone or ""))
    # Look at Gabon mobile prefix patterns
    if cleaned.startswith("241"):
        cleaned = cleaned[3:]
    if cleaned.startswith("0"):
        cleaned = cleaned[1:]

    # Airtel Gabon prefixes: 74, 76, 77, 11
    if cleaned.startswith(("74", "76", "77", "11")):
        return "AIRTEL_MONEY"
    # Moov Gabon prefixes: 62, 65, 66
    elif cleaned.startswith(("62", "65", "66")):
        return "MOOV_MONEY"
    return None


class MobileMoneyPaymentModal:
    def __init__(
        self,
        page: ft.Page,
        title: str,
        service_name: str,
        total_amount: int,
        is_cnamgs_eligible: bool = True,
        related_to: str = "APPOINTMENT",
        related_id: str = None,
        on_success=None,
    ):
        self.page = page
        self.title = title
        self.service_name = service_name
        self.total_amount = total_amount
        self.is_cnamgs_eligible = is_cnamgs_eligible
        self.related_to = related_to
        self.related_id = related_id or str(uuid.uuid4())
        self.on_success = on_success

        self.apply_cnamgs = is_cnamgs_eligible
        self.selected_operator = "AIRTEL_MONEY"  # AIRTEL_MONEY or MOOV_MONEY
        self.phone_value = ""
        self.dialog = None

    def calculate_amounts(self):
        if self.apply_cnamgs and self.is_cnamgs_eligible:
            cnamgs_part = int(self.total_amount * 0.80)
            patient_part = self.total_amount - cnamgs_part
        else:
            cnamgs_part = 0
            patient_part = self.total_amount
        return cnamgs_part, patient_part

    def show(self):
        self._render_step_1_summary()

    def _render_step_1_summary(self):
        cnamgs_part, patient_part = self.calculate_amounts()

        # Phone field with auto-detection listener
        phone_input = ft.TextField(
            label="Numéro Mobile Money (Gabon)",
            value=self.phone_value,
            prefix_text="🇬🇦 ",
            keyboard_type=ft.KeyboardType.PHONE,
            dense=True,
        )

        operator_badge = ft.Container(
            padding=ft.Padding.symmetric(horizontal=10, vertical=5),
            border_radius=8,
            bgcolor=MedicalColors.AIRTEL_BG if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BG,
            content=ft.Text(
                "Airtel Money (*150#)" if self.selected_operator == "AIRTEL_MONEY" else "Moov Money (*555#)",
                size=12,
                weight=ft.FontWeight.BOLD,
                color=MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE,
            ),
        )

        def on_phone_changed(e):
            self.phone_value = e.control.value
            detected = detect_operator(self.phone_value)
            if not detected:
                return
            if detected != self.selected_operator:
                self.selected_operator = detected
                operator_badge.bgcolor = MedicalColors.AIRTEL_BG if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BG
                operator_badge.content.value = "Airtel Money (*150#)" if self.selected_operator == "AIRTEL_MONEY" else "Moov Money (*555#)"
                operator_badge.content.color = MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE
                airtel_card.border = ft.Border.all(2, MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.BORDER)
                moov_card.border = ft.Border.all(2, MedicalColors.MOOV_BLUE if self.selected_operator == "MOOV_MONEY" else MedicalColors.BORDER)
                self.page.update()

        phone_input.on_change = on_phone_changed

        amount_display = ft.Column(
            spacing=4,
            controls=[
                ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Text("Tarif consultation :", size=13, color=MedicalColors.TEXT_SECONDARY),
                        ft.Text(f"{self.total_amount:,} FCFA".replace(",", " "), size=13, weight=ft.FontWeight.W_500),
                    ],
                ),
                ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Text("Couverture CNAMGS (80%) :", size=13, color=MedicalColors.PRIMARY),
                        ft.Text(f"- {cnamgs_part:,} FCFA".replace(",", " "), size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                    ],
                ) if self.apply_cnamgs else ft.Container(),
                ft.Divider(height=1, color=MedicalColors.BORDER),
                ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Text("Net à payer par Mobile Money :", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                        ft.Text(f"{patient_part:,} FCFA".replace(",", " "), size=16, weight=ft.FontWeight.BOLD, color=MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE),
                    ],
                ),
            ],
        )

        def on_cnamgs_toggle(e):
            self.apply_cnamgs = e.control.value
            c_part, p_part = self.calculate_amounts()
            self._update_amounts_ui(amount_display, c_part, p_part)
            self.page.update()

        # Operator Selector Cards
        def select_op(op):
            self.selected_operator = op
            operator_badge.bgcolor = MedicalColors.AIRTEL_BG if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BG
            operator_badge.content.value = "Airtel Money (*150#)" if self.selected_operator == "AIRTEL_MONEY" else "Moov Money (*555#)"
            operator_badge.content.color = MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE
            airtel_card.border = ft.Border.all(2, MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.BORDER)
            moov_card.border = ft.Border.all(2, MedicalColors.MOOV_BLUE if self.selected_operator == "MOOV_MONEY" else MedicalColors.BORDER)
            c_part, p_part = self.calculate_amounts()
            self._update_amounts_ui(amount_display, c_part, p_part)
            self.page.update()

        airtel_card = ft.Container(
            expand=True,
            padding=ft.Padding.all(10),
            border_radius=10,
            bgcolor="white",
            border=ft.Border.all(2, MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.BORDER),
            on_click=lambda _: select_op("AIRTEL_MONEY"),
            content=ft.Column(
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=2,
                controls=[
                    ft.Icon(ft.Icons.PHONE_ANDROID, color=MedicalColors.AIRTEL_RED, size=24),
                    ft.Text("Airtel Money", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.AIRTEL_RED),
                    ft.Text("074 / 076 / 077", size=10, color=MedicalColors.TEXT_MUTED),
                ],
            ),
        )

        moov_card = ft.Container(
            expand=True,
            padding=ft.Padding.all(10),
            border_radius=10,
            bgcolor="white",
            border=ft.Border.all(2, MedicalColors.MOOV_BLUE if self.selected_operator == "MOOV_MONEY" else MedicalColors.BORDER),
            on_click=lambda _: select_op("MOOV_MONEY"),
            content=ft.Column(
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=2,
                controls=[
                    ft.Icon(ft.Icons.ACCOUNT_BALANCE_WALLET, color=MedicalColors.MOOV_BLUE, size=24),
                    ft.Text("Moov Money", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.MOOV_BLUE),
                    ft.Text("062 / 065 / 066", size=10, color=MedicalColors.TEXT_MUTED),
                ],
            ),
        )

        dialog_content = ft.Container(
            width=380,
            content=ft.Column(
                tight=True,
                spacing=12,
                controls=[
                    ft.Container(
                        padding=ft.Padding.all(10),
                        border_radius=8,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Row(
                            spacing=8,
                            controls=[
                                ft.Icon(ft.Icons.MEDICAL_SERVICES, color=MedicalColors.PRIMARY, size=20),
                                ft.Expanded(
                                    content=ft.Text(self.service_name, size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                ),
                            ],
                        ),
                    ),
                    ft.Switch(
                        label="Assuré CNAMGS (Prise en charge 80%)",
                        value=self.apply_cnamgs,
                        active_color=MedicalColors.PRIMARY,
                        on_change=on_cnamgs_toggle,
                    ) if self.is_cnamgs_eligible else ft.Container(),
                    ft.Text("Choisir l'opérateur de paiement :", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY),
                    ft.Row(spacing=8, controls=[airtel_card, moov_card]),
                    phone_input,
                    ft.Row(alignment=ft.MainAxisAlignment.END, controls=[operator_badge]),
                    ft.Container(
                        padding=ft.Padding.all(12),
                        border_radius=10,
                        bgcolor=MedicalColors.BACKGROUND,
                        border=ft.Border.all(1, MedicalColors.BORDER),
                        content=amount_display,
                    ),
                ],
            ),
        )

        self.dialog = ft.AlertDialog(
            title=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Text(self.title, size=16, weight=ft.FontWeight.BOLD),
                    ft.IconButton(ft.Icons.CLOSE, icon_size=18, on_click=lambda _: close_modal(self.page, self.dialog)),
                ],
            ),
            content=dialog_content,
            actions=[
                ft.TextButton("Annuler", on_click=lambda _: close_modal(self.page, self.dialog)),
                ft.ElevatedButton(
                    "Payer maintenant",
                    icon=ft.Icons.PAYMENT,
                    bgcolor=MedicalColors.PRIMARY,
                    color="white",
                    on_click=lambda _: self._render_step_2_ussd_prompt(),
                ),
            ],
        )

        open_modal(self.page, self.dialog)

    def _update_amounts_ui(self, container, c_part, p_part):
        container.controls = [
            ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Text("Tarif consultation :", size=13, color=MedicalColors.TEXT_SECONDARY),
                    ft.Text(f"{self.total_amount:,} FCFA".replace(",", " "), size=13, weight=ft.FontWeight.W_500),
                ],
            ),
            ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Text("Couverture CNAMGS (80%) :", size=13, color=MedicalColors.PRIMARY),
                    ft.Text(f"- {c_part:,} FCFA".replace(",", " "), size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                ],
            ) if self.apply_cnamgs else ft.Container(),
            ft.Divider(height=1, color=MedicalColors.BORDER),
            ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Text("Net à payer par Mobile Money :", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                    ft.Text(f"{p_part:,} FCFA".replace(",", " "), size=16, weight=ft.FontWeight.BOLD, color=MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE),
                ],
            ),
        ]

    def _render_step_2_ussd_prompt(self):
        detected = detect_operator(self.phone_value)
        if not detected:
            show_toast(
                self.page,
                "Entrez un numéro Airtel Money (074, 076, 077, 011) ou Moov Money (062, 065, 066).",
                MedicalColors.EMERGENCY,
            )
            return
        if detected != self.selected_operator:
            self.selected_operator = detected
            show_toast(
                self.page,
                f"Ce numéro correspond à {'Airtel Money' if detected == 'AIRTEL_MONEY' else 'Moov Money'}.",
                MedicalColors.WARNING,
            )
            self.page.update()
            return

        close_modal(self.page, self.dialog)
        cnamgs_part, patient_part = self.calculate_amounts()

        op_name = "Airtel Money Gabon" if self.selected_operator == "AIRTEL_MONEY" else "Moov Money Flooz"
        op_color = MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE
        ussd_code = "*150#" if self.selected_operator == "AIRTEL_MONEY" else "*555#"

        pin_input = ft.TextField(
            label="Code PIN Secret",
            password=True,
            can_reveal_password=True,
            value="1234",
            keyboard_type=ft.KeyboardType.NUMBER,
            dense=True,
            autofocus=True,
        )

        ussd_dialog = ft.AlertDialog(
            title=ft.Row(
                spacing=8,
                controls=[
                    ft.Icon(ft.Icons.SIM_CARD_ALERT, color=op_color),
                    ft.Text(f"Push USSD ({op_name})", size=16, weight=ft.FontWeight.BOLD),
                ],
            ),
            content=ft.Container(
                width=360,
                content=ft.Column(
                    tight=True,
                    spacing=12,
                    controls=[
                        ft.Container(
                            padding=ft.Padding.all(12),
                            border_radius=8,
                            bgcolor="#1E293B",
                            content=ft.Column(
                                spacing=6,
                                controls=[
                                    ft.Text(f"SERVICE : {ussd_code} - PAIEMENT MARCHAND", size=11, color="#94A3B8", weight=ft.FontWeight.BOLD),
                                    ft.Text(f"Marchand : ELAM SANTE GABON", size=12, color="white", weight=ft.FontWeight.BOLD),
                                    ft.Text(f"Montant : {patient_part:,} FCFA".replace(",", " "), size=15, color="#4ADE80", weight=ft.FontWeight.BOLD),
                                    ft.Text(f"Destinataire : {self.service_name}", size=11, color="#E2E8F0"),
                                ],
                            ),
                        ),
                        ft.Text("Entrez votre code secret Mobile Money pour autoriser la transaction :", size=12, color=MedicalColors.TEXT_SECONDARY),
                        pin_input,
                    ],
                ),
            ),
            actions=[
                ft.TextButton("Refuser", on_click=lambda _: close_modal(self.page, ussd_dialog)),
                ft.ElevatedButton(
                    "Valider le débit",
                    bgcolor=op_color,
                    color="white",
                    on_click=lambda _: self._process_payment(ussd_dialog, patient_part, cnamgs_part, pin_input.value),
                ),
            ],
        )

        open_modal(self.page, ussd_dialog)

    def _process_payment(self, ussd_dialog, patient_part, cnamgs_part, pin_value):
        if not pin_value or not pin_value.isdigit() or len(pin_value) != 4:
            show_toast(self.page, "Le code PIN doit contenir 4 chiffres.", MedicalColors.EMERGENCY)
            return

        close_modal(self.page, ussd_dialog)

        try:
            res = api_client.initiate_payment(
                amount=self.total_amount,
                phone=self.phone_value,
                operator=self.selected_operator,
                related_to=self.related_to,
                related_id=self.related_id,
                apply_cnamgs=self.apply_cnamgs,
            )
        except Exception as ex:
            show_toast(self.page, f"Paiement refusé: {ex}", MedicalColors.EMERGENCY)
            return

        receipt_data = res.get("receipt", {})
        txn_ref = receipt_data.get("transactionRef", f"AM-GA-{str(uuid.uuid4())[:8].upper()}")

        # Show Digital Receipt Modal
        self._render_step_3_receipt(txn_ref, patient_part, cnamgs_part)

        if self.on_success:
            self.on_success(res.get("payment") or txn_ref)

    def _render_step_3_receipt(self, txn_ref, patient_part, cnamgs_part):
        now_str = datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")
        op_name = "Airtel Money" if self.selected_operator == "AIRTEL_MONEY" else "Moov Money Flooz"
        op_color = MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE

        receipt_content = ft.Container(
            width=360,
            padding=ft.Padding.all(16),
            border_radius=12,
            bgcolor="white",
            border=ft.Border.all(1, MedicalColors.BORDER),
            content=ft.Column(
                tight=True,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=10,
                controls=[
                    ft.Icon(ft.Icons.CHECK_CIRCLE, color=MedicalColors.SUCCESS, size=48),
                    ft.Text("Paiement Confirmé !", size=18, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=10, vertical=4),
                        border_radius=12,
                        bgcolor=MedicalColors.SUCCESS_BG,
                        content=ft.Text("REÇU OFFICIEL ELAM SANTÉ", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.SUCCESS),
                    ),
                    ft.Divider(color=MedicalColors.BORDER),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text("Réf. Transaction :", size=12, color=MedicalColors.TEXT_SECONDARY),
                            ft.Text(txn_ref, size=12, weight=ft.FontWeight.BOLD, color=op_color),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text("Date & Heure :", size=12, color=MedicalColors.TEXT_SECONDARY),
                            ft.Text(now_str, size=12, weight=ft.FontWeight.W_500),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text("Opérateur :", size=12, color=MedicalColors.TEXT_SECONDARY),
                            ft.Text(op_name, size=12, weight=ft.FontWeight.BOLD),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text("Service médical :", size=12, color=MedicalColors.TEXT_SECONDARY),
                            ft.Expanded(
                                content=ft.Text(self.service_name, size=12, weight=ft.FontWeight.BOLD, text_align=ft.TextAlign.RIGHT),
                            ),
                        ],
                    ),
                    ft.Divider(color=MedicalColors.BORDER),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text("Tarif Total :", size=12, color=MedicalColors.TEXT_SECONDARY),
                            ft.Text(f"{self.total_amount:,} FCFA".replace(",", " "), size=12),
                        ],
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text("Prise en charge CNAMGS :", size=12, color=MedicalColors.PRIMARY),
                            ft.Text(f"- {cnamgs_part:,} FCFA".replace(",", " "), size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                        ],
                    ) if self.apply_cnamgs else ft.Container(),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text("Montant Débité :", size=14, weight=ft.FontWeight.BOLD),
                            ft.Text(f"{patient_part:,} FCFA".replace(",", " "), size=16, weight=ft.FontWeight.BOLD, color=op_color),
                        ],
                    ),
                    ft.Container(height=8),
                    ft.Container(
                        padding=ft.Padding.all(8),
                        border_radius=8,
                        bgcolor=MedicalColors.BACKGROUND,
                        content=ft.Row(
                            alignment=ft.MainAxisAlignment.CENTER,
                            spacing=6,
                            controls=[
                                ft.Icon(ft.Icons.VERIFIED, color=MedicalColors.PRIMARY, size=16),
                                ft.Text("Transaction sécurisée par ELAM Gabon", size=11, color=MedicalColors.TEXT_SECONDARY),
                            ],
                        ),
                    ),
                ],
            ),
        )

        receipt_dialog = ft.AlertDialog(
            title=ft.Text("Reçu de Paiement Numérique"),
            content=receipt_content,
            actions=[
                ft.ElevatedButton(
                    "Télécharger / Fermer",
                    bgcolor=MedicalColors.PRIMARY,
                    color="white",
                    on_click=lambda _: close_modal(self.page, receipt_dialog),
                ),
            ],
        )

        open_modal(self.page, receipt_dialog)
        show_toast(self.page, f"✅ Paiement de {patient_part:,} FCFA validé via {op_name} !", MedicalColors.SUCCESS)
