"""Ecran de connexion ELAM.

Equivalent de la connexion du site web (AuthContext.switchDemoUser / api.login),
mais explicite : l'utilisateur choisit son compte au lieu d'etre connecte
automatiquement en mode demonstration.
"""
import threading

import flet as ft

from services.api_client import api_client, ElamApiError
from theme.colors import MedicalColors, MedicalStyles

# Comptes de demonstration (le mot de passe est le meme pour tous, cf. prisma/seed.ts)
DEMO_PASSWORD = "Password123!"
DEMO_ACCOUNTS = [
    ("Patient", "patient.hans@elam.ga", ft.Icons.PERSON_ROUNDED, "#059669"),
    ("Medecin", "dr.minko@elam.ga", ft.Icons.MEDICAL_SERVICES_ROUNDED, "#2563EB"),
    ("Pharmacie", "contact@pharmacie-okala.ga", ft.Icons.LOCAL_PHARMACY_ROUNDED, "#D97706"),
    ("Admin", "admin@elam.ga", ft.Icons.ADMIN_PANEL_SETTINGS_ROUNDED, "#E11D48"),
]


class LoginView:
    def __init__(self, page: ft.Page, on_success):
        self.page = page
        self.on_success = on_success
        self.is_loading = False

        self.identifier = ft.TextField(
            label="Email ou telephone",
            hint_text="patient.hans@elam.ga",
            prefix_icon=ft.Icons.ALTERNATE_EMAIL_ROUNDED,
            keyboard_type=ft.KeyboardType.EMAIL,
            autofocus=True,
            border_color=MedicalColors.BORDER,
            focused_border_color=MedicalColors.PRIMARY,
            on_submit=lambda _: self._submit(),
        )
        self.password = ft.TextField(
            label="Mot de passe",
            password=True,
            can_reveal_password=True,
            prefix_icon=ft.Icons.LOCK_ROUNDED,
            border_color=MedicalColors.BORDER,
            focused_border_color=MedicalColors.PRIMARY,
            on_submit=lambda _: self._submit(),
        )
        self.error_text = ft.Text("", size=12, color=MedicalColors.EMERGENCY, visible=False)
        self.spinner = ft.ProgressRing(width=16, height=16, stroke_width=2, color="white", visible=False)
        self.submit_label = ft.Text("Se connecter", size=14, weight=ft.FontWeight.BOLD, color="white")
        self.submit_button = ft.ElevatedButton(
            content=ft.Row(
                [self.spinner, self.submit_label],
                alignment=ft.MainAxisAlignment.CENTER,
                tight=True,
                spacing=8,
            ),
            bgcolor=MedicalColors.PRIMARY,
            color="white",
            height=48,
            style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=14)),
            on_click=lambda _: self._submit(),
        )

    # ------------------------------------------------------------------ rendu
    def build(self) -> ft.Container:
        demo_buttons = [
            ft.Container(
                content=ft.Row(
                    [
                        ft.Icon(icon, size=16, color=color),
                        ft.Text(label, size=12, weight=ft.FontWeight.W_600, color=MedicalColors.TEXT_PRIMARY),
                    ],
                    tight=True,
                    spacing=6,
                ),
                padding=ft.Padding.symmetric(horizontal=12, vertical=9),
                border=ft.Border.all(1, MedicalColors.BORDER),
                border_radius=12,
                bgcolor=MedicalColors.CARD_BG,
                on_click=lambda _, email=email: self._quick_login(email),
                ink=True,
            )
            for label, email, icon, color in DEMO_ACCOUNTS
        ]

        card = ft.Container(
            content=ft.Column(
                [
                    ft.Text("Connexion", size=20, weight=ft.FontWeight.W_800, color=MedicalColors.TEXT_PRIMARY),
                    ft.Text(
                        "Accedez a votre espace sante ELAM",
                        size=12,
                        color=MedicalColors.TEXT_SECONDARY,
                    ),
                    ft.Container(height=6),
                    self.identifier,
                    self.password,
                    self.error_text,
                    self.submit_button,
                    ft.Row(
                        [
                            ft.Container(height=1, bgcolor=MedicalColors.BORDER, expand=True),
                            ft.Text("ou connexion rapide (demo)", size=10, color=MedicalColors.TEXT_MUTED),
                            ft.Container(height=1, bgcolor=MedicalColors.BORDER, expand=True),
                        ],
                        vertical_alignment=ft.CrossAxisAlignment.CENTER,
                        spacing=8,
                    ),
                    ft.Row(demo_buttons, wrap=True, spacing=8, run_spacing=8),
                    ft.Text(
                        "Les comptes de demonstration utilisent le mot de passe "
                        f"'{DEMO_PASSWORD}'. En production, desactivez-les.",
                        size=9,
                        color=MedicalColors.TEXT_MUTED,
                    ),
                ],
                spacing=10,
                tight=True,
            ),
            padding=20,
            bgcolor=MedicalColors.CARD_BG,
            border_radius=24,
            border=ft.Border.all(1, MedicalColors.BORDER),
            shadow=MedicalStyles.SHADOW_LG,
            width=380,
        )

        return ft.Container(
            expand=True,
            bgcolor="#020617",
            alignment=ft.Alignment.CENTER,
            padding=20,
            content=ft.Column(
                [
                    ft.Container(
                        width=72,
                        height=72,
                        border_radius=24,
                        gradient=ft.LinearGradient(
                            colors=["#34D399", "#14B8A6"],
                            begin=ft.Alignment.TOP_LEFT,
                            end=ft.Alignment.BOTTOM_RIGHT,
                        ),
                        alignment=ft.Alignment.CENTER,
                        content=ft.Icon(ft.Icons.MONITOR_HEART_ROUNDED, size=38, color="white"),
                    ),
                    ft.Text("ELAM", size=26, weight=ft.FontWeight.W_900, color="white"),
                    ft.Text("Le reflexe sante au Gabon", size=12, color="#94A3B8"),
                    ft.Container(height=8),
                    card,
                ],
                tight=True,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=8,
                scroll=ft.ScrollMode.AUTO,
            ),
        )

    # ------------------------------------------------------------- actions
    def _show_error(self, message: str):
        self.error_text.value = message
        self.error_text.visible = True
        self.page.update()

    def _set_loading(self, value: bool):
        self.is_loading = value
        self.spinner.visible = value
        self.submit_label.value = "Connexion..." if value else "Se connecter"
        self.submit_button.disabled = value
        self.page.update()

    def _quick_login(self, email: str):
        """Un clic sur un compte de demo remplit les champs et se connecte."""
        if self.is_loading:
            return
        self.identifier.value = email
        self.password.value = DEMO_PASSWORD
        self.error_text.visible = False
        self.page.update()
        self._submit()

    def _submit(self):
        if self.is_loading:
            return
        identifier = (self.identifier.value or "").strip()
        password = self.password.value or ""

        if not identifier or not password:
            self._show_error("Renseignez votre email/telephone et votre mot de passe.")
            return

        self.error_text.visible = False
        self._set_loading(True)

        # Appel reseau dans un thread pour ne pas figer l'interface
        threading.Thread(target=self._do_login, args=(identifier, password), daemon=True).start()

    def _do_login(self, identifier: str, password: str):
        try:
            api_client.login(identifier, password)
            self._set_loading(False)
            self.on_success()
        except ElamApiError as exc:
            self._set_loading(False)
            self._show_error(exc.message)
        except Exception as exc:  # filet de securite : jamais d'ecran fige
            self._set_loading(False)
            self._show_error(f"Connexion impossible : {exc}")
