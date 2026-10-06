import threading
import time
import datetime
import flet as ft
from theme.colors import MedicalColors
from utils.ui import open_modal, close_modal, show_toast
from services.api_client import api_client, ElamApiError


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
        # On n'invente JAMAIS de reference : un paiement doit viser un service reel.
        # L'ancien code fabriquait un UUID au hasard, et le paiement ne pouvait
        # alors confirmer aucun rendez-vous.
        self.related_id = related_id
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
            prefix=ft.Text("🇬🇦 "),
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
                        ft.Text("Couverture CNAMGS estimée :", size=13, color=MedicalColors.PRIMARY),
                        ft.Text(f"- {cnamgs_part:,} FCFA".replace(",", " "), size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                    ],
                ) if self.apply_cnamgs else ft.Container(),
                ft.Divider(height=1, color=MedicalColors.BORDER),
                ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Text("Estimation à débiter :", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                        ft.Text(f"{patient_part:,} FCFA".replace(",", " "), size=16, weight=ft.FontWeight.BOLD, color=MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE),
                    ],
                ),
            ],
        )

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
                                ft.Container(
                                    expand=True,
                                    content=ft.Text(self.service_name, size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                ),
                            ],
                        ),
                    ),
                    ft.Container(
                        padding=ft.Padding.all(10),
                        border_radius=8,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Row(
                            spacing=8,
                            controls=[
                                ft.Icon(ft.Icons.SHIELD_ROUNDED, color=MedicalColors.PRIMARY, size=18),
                                ft.Container(
                                    expand=True,
                                    content=ft.Column(
                                        tight=True,
                                        spacing=2,
                                        controls=[
                                            ft.Text("Prise en charge CNAMGS", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                            ft.Text(
                                                "Appliquée automatiquement par nos services si vous êtes bénéficiaire. "
                                                "Le montant exact vous sera confirmé avant validation.",
                                                size=10,
                                                color=MedicalColors.TEXT_SECONDARY,
                                            ),
                                        ],
                                    ),
                                ),
                            ],
                        ),
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
        """Envoie la demande a l'operateur, puis suit la validation sur le telephone."""
        if not self.related_id:
            show_toast(self.page, "Cette opération n'a pas encore de référence à régler.", MedicalColors.EMERGENCY)
            return

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

        # Le montant n'est PAS transmis : le serveur le calcule a partir du
        # rendez-vous, de la reservation ou de la formule d'abonnement.
        try:
            res = api_client.initiate_payment(
                related_to=self.related_to,
                related_id=self.related_id,
                phone=self.phone_value,
                operator=self.selected_operator,
            )
        except (ElamApiError, ValueError) as ex:
            show_toast(self.page, f"Paiement refusé : {ex}", MedicalColors.EMERGENCY)
            return

        payment = res.get("payment") or {}
        self._render_waiting_dialog(payment, res.get("instructions") or "")

    def _render_waiting_dialog(self, payment: dict, instructions: str):
        """Attente de la validation chez l'operateur.

        On ne demande JAMAIS le code PIN Mobile Money : le client le saisit chez
        son operateur (invite USSD ou application). Demander un PIN dans une
        application tierce est exactement la forme d'une attaque par harponnage,
        et les operateurs l'interdisent.
        """
        op_color = MedicalColors.AIRTEL_RED if self.selected_operator == "AIRTEL_MONEY" else MedicalColors.MOOV_BLUE
        op_name = "Airtel Money" if self.selected_operator == "AIRTEL_MONEY" else "Moov Money"
        ussd_code = "*150#" if self.selected_operator == "AIRTEL_MONEY" else "*555#"
        patient_part = int(payment.get("patientAmount") or 0)
        cnamgs_part = int(payment.get("cnamgsCovered") or 0)
        total_part = int(payment.get("amount") or 0)
        txn_ref = payment.get("transactionRef", "")

        waiting_dialog = ft.AlertDialog(
            title=ft.Row(
                spacing=8,
                controls=[
                    ft.Icon(ft.Icons.SIM_CARD_ALERT, color=op_color),
                    ft.Text(f"Validation {op_name}", size=16, weight=ft.FontWeight.BOLD),
                ],
            ),
            content=ft.Container(
                width=360,
                content=ft.Column(
                    tight=True,
                    spacing=12,
                    controls=[
                        ft.Row(
                            spacing=10,
                            controls=[
                                ft.ProgressRing(width=18, height=18, stroke_width=2, color=op_color),
                                ft.Container(
                                    expand=True,
                                    content=ft.Text(
                                        "En attente de validation sur votre téléphone…",
                                        size=12,
                                        color=MedicalColors.TEXT_SECONDARY,
                                    ),
                                ),
                            ],
                        ),
                        ft.Container(
                            padding=ft.Padding.all(12),
                            border_radius=8,
                            bgcolor="#1E293B",
                            content=ft.Column(
                                spacing=6,
                                controls=[
                                    ft.Text(f"SERVICE : {ussd_code} - PAIEMENT MARCHAND", size=11, color="#94A3B8", weight=ft.FontWeight.BOLD),
                                    ft.Text("Marchand : ELAM SANTE GABON", size=12, color="white", weight=ft.FontWeight.BOLD),
                                    ft.Text(f"Montant : {patient_part:,} FCFA".replace(",", " "), size=15, color="#4ADE80", weight=ft.FontWeight.BOLD),
                                    ft.Text(f"Destinataire : {self.service_name}", size=11, color="#E2E8F0"),
                                ],
                            ),
                        ),
                        ft.Text(
                            "Validez la transaction chez votre opérateur. Ne saisissez jamais votre code secret ici.",
                            size=11,
                            color=MedicalColors.TEXT_SECONDARY,
                        ),
                        ft.Container(
                            padding=ft.Padding.all(10),
                            border_radius=8,
                            bgcolor=MedicalColors.BACKGROUND,
                            content=ft.Column(
                                spacing=4,
                                controls=[
                                    ft.Row(
                                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                        controls=[
                                            ft.Text("Montant du service :", size=12, color=MedicalColors.TEXT_SECONDARY),
                                            ft.Text(f"{total_part:,} FCFA".replace(",", " "), size=12),
                                        ],
                                    ),
                                    ft.Row(
                                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                        controls=[
                                            ft.Text("Part CNAMGS :", size=12, color=MedicalColors.PRIMARY),
                                            ft.Text(f"- {cnamgs_part:,} FCFA".replace(",", " "), size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                                        ],
                                    ),
                                    ft.Divider(height=1, color=MedicalColors.BORDER),
                                    ft.Row(
                                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                        controls=[
                                            ft.Text("Net à débiter :", size=13, weight=ft.FontWeight.BOLD),
                                            ft.Text(f"{patient_part:,} FCFA".replace(",", " "), size=15, weight=ft.FontWeight.BOLD, color=op_color),
                                        ],
                                    ),
                                ],
                            ),
                        ),
                        ft.Text(f"Réf. {txn_ref}", size=10, color=MedicalColors.TEXT_MUTED),
                    ],
                ),
            ),
            actions=[
                ft.TextButton(
                    "Vérifier maintenant",
                    on_click=lambda _: self._check_payment_now(waiting_dialog, txn_ref),
                ),
                ft.TextButton("Fermer", on_click=lambda _: close_modal(self.page, waiting_dialog)),
            ],
        )

        open_modal(self.page, waiting_dialog)
        threading.Thread(target=self._poll_payment, args=(waiting_dialog, txn_ref), daemon=True).start()

    def _check_payment_now(self, waiting_dialog, txn_ref):
        try:
            current = api_client.get_payment_status(txn_ref)
        except (ElamApiError, ValueError) as ex:
            show_toast(self.page, f"Vérification impossible : {ex}", MedicalColors.WARNING)
            return
        self._apply_payment_state(waiting_dialog, current)

    def _poll_payment(self, waiting_dialog, txn_ref):
        """Suit le paiement jusqu'a confirmation par l'operateur (2 minutes max)."""
        deadline = time.time() + 120
        while time.time() < deadline:
            time.sleep(3)
            try:
                current = api_client.get_payment_status(txn_ref)
            except Exception:
                continue  # erreur reseau passagere : on retente au cycle suivant
            if self._apply_payment_state(waiting_dialog, current):
                return
        show_toast(
            self.page,
            "Validation non reçue. Vérifiez sur votre téléphone, puis relancez la vérification.",
            MedicalColors.WARNING,
        )

    def _apply_payment_state(self, waiting_dialog, current: dict) -> bool:
        """Renvoie True si le paiement est termine (confirme ou echoue)."""
        status = (current or {}).get("status")

        if status == "COMPLETED":
            close_modal(self.page, waiting_dialog)
            self.page.update()
            self._render_step_3_receipt(current)
            if self.on_success:
                self.on_success(current)
            return True

        if status in ("FAILED", "CANCELLED"):
            reason = (current or {}).get("failureReason") or "Transaction refusée ou annulée."
            close_modal(self.page, waiting_dialog)
            show_toast(self.page, f"Paiement non abouti : {reason}", MedicalColors.EMERGENCY)
            return True

        return False

    def _render_step_3_receipt(self, payment: dict):
        """Recu affiche UNIQUEMENT apres confirmation par l'operateur."""
        now_str = datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")
        txn_ref = payment.get("transactionRef", "")
        patient_part = int(payment.get("patientAmount") or 0)
        cnamgs_part = int(payment.get("cnamgsCovered") or 0)
        self.total_amount = int(payment.get("amount") or self.total_amount)
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
                            ft.Container(
                                expand=True,
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
                    ) if cnamgs_part > 0 else ft.Container(),
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
