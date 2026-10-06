import flet as ft
from theme.colors import MedicalColors
from services.api_client import api_client, ElamApiError
from services.api_models import api_list, api_object
from utils.ui import show_toast, render_then_load
from views.appointments_view import format_appointment_date


class PortalView:
    def __init__(self, page: ft.Page):
        self.page = page
        self.current_role = "DOCTOR"  # DOCTOR, PHARMACY, PRICING
        self.content_column = ft.Column(spacing=12, scroll=ft.ScrollMode.ADAPTIVE)

    def build(self):
        header = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=12),
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.only(bottom=ft.BorderSide(1, MedicalColors.BORDER)),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Text("Portails Professionnels", size=18, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                        border_radius=12,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Text("Mode Démo Pro", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                    ),
                ],
            ),
        )

        # Role switcher tabs
        self.role_tabs = ft.Row(
            scroll=ft.ScrollMode.ADAPTIVE,
            spacing=8,
            controls=[
                self._build_tab_button("🩺 Espace Médecin", "DOCTOR"),
                self._build_tab_button("💊 Espace Pharmacie", "PHARMACY"),
                self._build_tab_button("💳 Abonnements Pro", "PRICING"),
            ],
        )

        render_then_load(self.page, self.content_column, self.refresh_portal)

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
                        spacing=12,
                        controls=[
                            self.role_tabs,
                            ft.Divider(height=1, color=MedicalColors.BORDER),
                            ft.Container(
                                expand=True,
                                content=self.content_column,
                            ),
                        ],
                    ),
                ),
            ],
        )

    def _build_tab_button(self, label, role):
        is_active = self.current_role == role
        return ft.Container(
            padding=ft.Padding.symmetric(horizontal=12, vertical=8),
            border_radius=10,
            bgcolor=MedicalColors.PRIMARY if is_active else MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.PRIMARY if is_active else MedicalColors.BORDER),
            content=ft.Text(
                label,
                size=12,
                weight=ft.FontWeight.BOLD if is_active else ft.FontWeight.NORMAL,
                color="white" if is_active else MedicalColors.TEXT_PRIMARY,
            ),
            on_click=lambda _, r=role: self.set_role(r),
            ink=True,
        )

    def set_role(self, role):
        self.current_role = role
        # Update tab styles
        for idx, r in enumerate(["DOCTOR", "PHARMACY", "PRICING"]):
            is_active = self.current_role == r
            self.role_tabs.controls[idx].bgcolor = MedicalColors.PRIMARY if is_active else MedicalColors.CARD_BG
            self.role_tabs.controls[idx].border = ft.Border.all(1, MedicalColors.PRIMARY if is_active else MedicalColors.BORDER)
            self.role_tabs.controls[idx].content.color = "white" if is_active else MedicalColors.TEXT_PRIMARY
            self.role_tabs.controls[idx].content.weight = ft.FontWeight.BOLD if is_active else ft.FontWeight.NORMAL
        self.refresh_portal()

    def refresh_portal(self):
        self.content_column.controls.clear()
        if not api_client.is_authenticated:
            self.content_column.controls.append(
                self._info_card("Connectez-vous pour accéder à votre espace professionnel.")
            )
            if self.page:
                self.page.update()
            return

        if self.current_role == "DOCTOR":
            self._render_doctor_portal()
        elif self.current_role == "PHARMACY":
            self._render_pharmacy_portal()
        elif self.current_role == "PRICING":
            self._render_pricing_portal()

        if self.page:
            self.page.update()

    def _info_card(self, message: str, color: str = None):
        color = color or MedicalColors.WARNING
        return ft.Container(
            padding=ft.Padding.all(16),
            border_radius=14,
            bgcolor=MedicalColors.EMERGENCY_LIGHT if color == MedicalColors.EMERGENCY else MedicalColors.WARNING_BG,
            content=ft.Text(message, size=12, color=color, weight=ft.FontWeight.W_600),
        )

    def _render_doctor_portal(self):
        profile = api_client.doctor_profile
        if not profile:
            self.content_column.controls.append(
                self._info_card(
                    "Votre compte n'est pas un compte médecin : cet espace est réservé aux praticiens.",
                    MedicalColors.EMERGENCY,
                )
            )
            return

        doc_name = f"{profile.get('title') or 'Dr.'} {api_client.full_name}".strip()

        pro_card = ft.Container(
            padding=ft.Padding.all(14),
            border_radius=12,
            bgcolor=MedicalColors.PRIMARY_LIGHT,
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text(doc_name, size=15, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                            ft.Text(f"{profile.get('specialty')} • {profile.get('district')}", size=12, color=MedicalColors.TEXT_SECONDARY),
                            ft.Text(
                                f"N° CNOM : {profile.get('cnomNumber')} • {profile.get('verificationStatus')}",
                                size=10,
                                color=MedicalColors.PRIMARY,
                            ),
                        ],
                    ),
                    ft.Icon(ft.Icons.VERIFIED_USER, color=MedicalColors.PRIMARY, size=32),
                ],
            ),
        )
        self.content_column.controls.append(pro_card)
        self.content_column.controls.append(
            ft.Text("Demandes de Consultations Récentes", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY)
        )

        # Agenda du praticien CONNECTE (avant : toute la table locale)
        try:
            appointments = api_list(api_client.get_doctor_appointments())
        except ElamApiError as exc:
            self.content_column.controls.append(self._info_card(exc.message, MedicalColors.EMERGENCY))
            return

        if not appointments:
            self.content_column.controls.append(
                ft.Text("Aucune demande de consultation pour le moment.", size=12, color=MedicalColors.TEXT_SECONDARY)
            )
            return

        for apt in appointments:
            self.content_column.controls.append(self._build_doctor_apt_card(apt))

    def _build_doctor_apt_card(self, apt):
        is_confirmed = apt.status == "CONFIRMED"

        patient_name = "Patient"
        if getattr(apt, "patient", None) and getattr(apt.patient, "user", None):
            patient_name = f"{apt.patient.user.first_name} {apt.patient.user.last_name}".strip()

        def confirm_apt(e):
            try:
                api_client.update_appointment_status(apt.id, "CONFIRMED")
            except ElamApiError as exc:
                show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
                return
            show_toast(self.page, "✅ Rendez-vous validé.", MedicalColors.SUCCESS)
            self.refresh_portal()

        return ft.Container(
            padding=ft.Padding.all(12),
            border_radius=12,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            content=ft.Column(
                spacing=8,
                controls=[
                    ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Text(f"Patient : {patient_name}", size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                            ft.Container(
                                padding=ft.Padding.symmetric(horizontal=8, vertical=3),
                                border_radius=6,
                                bgcolor=MedicalColors.SUCCESS_BG if is_confirmed else MedicalColors.WARNING_BG,
                                content=ft.Text("CONFIRMÉ" if is_confirmed else "EN ATTENTE", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.SUCCESS if is_confirmed else MedicalColors.WARNING),
                            ),
                        ],
                    ),
                    ft.Text(
                        f"Créneau : {format_appointment_date(apt.appointment_date)} à {apt.start_time} • Motif : {apt.reason}",
                        size=11,
                        color=MedicalColors.TEXT_SECONDARY,
                    ),
                    ft.Row(
                        alignment=ft.MainAxisAlignment.END,
                        controls=[
                            ft.ElevatedButton(
                                "Valider le Rendez-vous",
                                icon=ft.Icons.CHECK,
                                bgcolor=MedicalColors.PRIMARY,
                                color="white",
                                disabled=is_confirmed,
                                on_click=confirm_apt,
                            ) if not is_confirmed else ft.Text("Consultation planifiée", size=11, color=MedicalColors.SUCCESS),
                        ],
                    ),
                ],
            ),
        )

    def _render_pharmacy_portal(self):
        profile = api_client.pharmacy_profile
        if not profile:
            self.content_column.controls.append(
                self._info_card(
                    "Votre compte n'est pas un compte pharmacie : cet espace est réservé aux officines.",
                    MedicalColors.EMERGENCY,
                )
            )
            return

        # Etat a jour de l'officine CONNECTEE (avant : toujours la premiere en base)
        try:
            pharm = api_object(api_client.get_pharmacy_by_id(profile["id"]))
        except ElamApiError as exc:
            self.content_column.controls.append(self._info_card(exc.message, MedicalColors.EMERGENCY))
            return

        def toggle_duty(e):
            try:
                api_client.update_duty_status(bool(e.control.value))
            except ElamApiError as exc:
                show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
                return
            show_toast(
                self.page,
                f"Statut De Garde : {'ACTIVÉ (Doré)' if e.control.value else 'DÉSACTIVÉ'}",
                MedicalColors.DUTY_GOLD if e.control.value else MedicalColors.TEXT_SECONDARY,
            )
            self.refresh_portal()

        duty_card = ft.Container(
            padding=ft.Padding.all(14),
            border_radius=12,
            bgcolor=MedicalColors.DUTY_LIGHT if pharm.is_on_duty else MedicalColors.BACKGROUND,
            border=ft.Border.all(1, MedicalColors.DUTY_GOLD if pharm.is_on_duty else MedicalColors.BORDER),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text(pharm.name, size=15, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text("Bascule de permanence de garde 24/7", size=11, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Switch(
                        value=pharm.is_on_duty,
                        active_color=MedicalColors.DUTY_GOLD,
                        on_change=toggle_duty,
                    ),
                ],
            ),
        )
        self.content_column.controls.append(duty_card)
        self.content_column.controls.append(
            ft.Text("Gestion Rapide des Stocks", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY)
        )

        stocks = pharm.stocks or []
        if not stocks:
            self.content_column.controls.append(
                ft.Text("Aucun stock déclaré pour votre officine.", size=12, color=MedicalColors.TEXT_SECONDARY)
            )
        for s in stocks:
            self.content_column.controls.append(self._build_stock_control_card(s))

    def _build_stock_control_card(self, stock):
        def change_status(new_status):
            try:
                api_client.update_stock(medication_id=stock.medication_id, status=new_status)
            except ElamApiError as exc:
                show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
                return
            show_toast(self.page, f"Stock de {stock.medication.name} mis à jour : {new_status}", MedicalColors.PRIMARY)
            self.refresh_portal()

        return ft.Container(
            padding=ft.Padding.all(12),
            border_radius=12,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text(stock.medication.name, size=13, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text(f"Prix : {stock.price_fcfa:,} FCFA • Qté : {stock.quantity}".replace(",", " "), size=11, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Row(
                        spacing=4,
                        controls=[
                            ft.ElevatedButton(
                                "En stock",
                                bgcolor=MedicalColors.SUCCESS if stock.status == "IN_STOCK" else MedicalColors.BACKGROUND,
                                color="white" if stock.status == "IN_STOCK" else MedicalColors.TEXT_PRIMARY,
                                on_click=lambda _: change_status("IN_STOCK"),
                            ),
                            ft.ElevatedButton(
                                "Épuisé",
                                bgcolor=MedicalColors.EMERGENCY if stock.status == "OUT_OF_STOCK" else MedicalColors.BACKGROUND,
                                color="white" if stock.status == "OUT_OF_STOCK" else MedicalColors.TEXT_PRIMARY,
                                on_click=lambda _: change_status("OUT_OF_STOCK"),
                            ),
                        ],
                    ),
                ],
            ),
        )

    def _render_pricing_portal(self):
        # Grille tarifaire reelle du backend (le site la codait en dur)
        try:
            plans = api_list(api_client.get_plans())
        except ElamApiError as exc:
            self.content_column.controls.append(self._info_card(exc.message, MedicalColors.EMERGENCY))
            return

        role_colors = {
            "PATIENT": MedicalColors.PRIMARY,
            "DOCTOR": MedicalColors.SECONDARY,
            "PHARMACY": MedicalColors.DUTY_GOLD,
            "CLINIC": MedicalColors.EMERGENCY,
            "ENTERPRISE": MedicalColors.SECONDARY_DARK,
        }

        for plan in plans:
            color = role_colors.get(plan.target_role, MedicalColors.PRIMARY)
            period = "an" if plan.interval == "YEARLY" else "mois"
            price = "Gratuit" if not plan.price_fcfa else f"{plan.price_fcfa:,} FCFA / {period}".replace(",", " ")

            feature_controls = [
                ft.Row(
                    spacing=6,
                    controls=[
                        ft.Icon(ft.Icons.CHECK_CIRCLE, color=color, size=16),
                        ft.Text(f, size=11, color=MedicalColors.TEXT_PRIMARY),
                    ],
                )
                for f in (plan.features or [])
            ]

            card_controls = [
                ft.Row(
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    controls=[
                        ft.Text(plan.name, size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                        ft.Text(price, size=14, weight=ft.FontWeight.BOLD, color=color),
                    ],
                ),
                ft.Text(plan.target_role, size=10, color=MedicalColors.TEXT_MUTED),
                ft.Divider(height=1, color=MedicalColors.BORDER),
                ft.Column(spacing=4, controls=feature_controls),
            ]

            if plan.price_fcfa:
                card_controls.append(
                    ft.ElevatedButton(
                        "Souscrire",
                        bgcolor=color,
                        color="white",
                        style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=10)),
                        on_click=lambda _, plan_type=plan.plan_type: self._subscribe(plan_type),
                    )
                )

            self.content_column.controls.append(
                ft.Container(
                    padding=ft.Padding.all(14),
                    border_radius=12,
                    bgcolor=MedicalColors.CARD_BG,
                    border=ft.Border.all(1, MedicalColors.BORDER),
                    content=ft.Column(spacing=8, controls=card_controls),
                )
            )

    def _subscribe(self, plan_type: str):
        """ATTENTION : le backend active l'abonnement sans exiger de paiement.

        Cote site web les boutons « Souscrire » ne font rien du tout ; ici ils
        fonctionnent, mais la verification du paiement reste a faire cote serveur.
        """
        try:
            api_client.subscribe(plan_type)
        except ElamApiError as exc:
            show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
            return
        show_toast(self.page, f"Souscription « {plan_type} » enregistrée.", MedicalColors.SUCCESS)
        self.refresh_portal()
