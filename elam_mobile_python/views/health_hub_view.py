import flet as ft
from theme.colors import MedicalColors
from data.database import SessionLocal
from data.models import PatientProfile, Prescription, PillReminder, BloodDonationRequest, Payment, User
from utils.ui import show_toast, open_modal, close_modal


class HealthHubView:
    def __init__(self, page: ft.Page):
        self.page = page
        self.current_section = "RECORD" # RECORD, PRESCRIPTIONS, REMINDERS, DONATION
        self.content_column = ft.Column(spacing=12, scroll=ft.ScrollMode.ADAPTIVE)

    def build(self):
        header = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=12),
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.only(bottom=ft.BorderSide(1, MedicalColors.BORDER)),
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Text("Mon Espace Santé", size=18, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=8, vertical=4),
                        border_radius=12,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Text("Patient", size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY),
                    ),
                ],
            ),
        )

        # Tab navigation for Health Hub
        self.tabs = ft.Row(
            scroll=ft.ScrollMode.ADAPTIVE,
            spacing=8,
            controls=[
                self._build_tab_button("📋 Carnet", "RECORD"),
                self._build_tab_button("📄 Ordonnances", "PRESCRIPTIONS"),
                self._build_tab_button("⏰ Rappels", "REMINDERS"),
                self._build_tab_button("🩸 Don de Sang", "DONATION"),
            ],
        )

        self.refresh_content()

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
                            self.tabs,
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

    def _build_tab_button(self, label, section):
        is_active = self.current_section == section
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
            on_click=lambda _, s=section: self.set_section(s),
            ink=True,
        )

    def set_section(self, section):
        self.current_section = section
        self.refresh_content()

    def refresh_content(self):
        self.content_column.controls.clear()
        db = SessionLocal()
        try:
            patient = db.query(PatientProfile).first()
            if not patient:
                self.content_column.controls.append(ft.Text("Veuillez vous connecter."))
                return

            if self.current_section == "RECORD":
                self._render_health_record(patient)
            elif self.current_section == "PRESCRIPTIONS":
                self._render_prescriptions(db, patient)
            elif self.current_section == "REMINDERS":
                self._render_reminders(db, patient)
            elif self.current_section == "DONATION":
                self._render_blood_donation(db)

            if self.page:
                self.page.update()
        finally:
            db.close()

    def _render_health_record(self, patient: PatientProfile):
        self.content_column.controls.append(
            ft.Container(
                padding=ft.Padding.all(16),
                border_radius=12,
                bgcolor=MedicalColors.PRIMARY_LIGHT,
                content=ft.Column(
                    spacing=12,
                    controls=[
                        ft.Row(
                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                            controls=[
                                ft.Text("Identité Médicale", size=16, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                ft.Icon(ft.Icons.BADGE, color=MedicalColors.PRIMARY),
                            ],
                        ),
                        ft.Row(
                            spacing=20,
                            controls=[
                                ft.Column(
                                    controls=[
                                        ft.Text("GROUPE SANGUIN", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY),
                                        ft.Text(patient.blood_group or "Non renseigné", size=18, weight=ft.FontWeight.BOLD, color=MedicalColors.EMERGENCY),
                                    ]
                                ),
                                ft.Column(
                                    controls=[
                                        ft.Text("N° CNAMGS", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY),
                                        ft.Text(patient.cnamgs_number or "Aucun", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                                    ]
                                ),
                            ]
                        ),
                        ft.Divider(height=1, color=MedicalColors.PRIMARY),
                        ft.Text("ALLERGIES", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY),
                        ft.Text(patient.allergies or "Aucune allergie connue", size=12, color=MedicalColors.TEXT_PRIMARY),
                        ft.Text("HISTORIQUE VACCINAL", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY),
                        ft.Text(patient.vaccination_history or "Aucun historique", size=12, color=MedicalColors.TEXT_PRIMARY),
                    ]
                )
            )
        )
        self.content_column.controls.append(
            ft.ElevatedButton(
                "Mettre à jour mon carnet",
                icon=ft.Icons.EDIT,
                on_click=lambda _: show_toast(self.page, "Fonctionnalité d'édition bientôt disponible", MedicalColors.PRIMARY)
            )
        )

    def _render_prescriptions(self, db, patient):
        prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient.id).all()
        if not prescriptions:
            self.content_column.controls.append(ft.Text("Aucune ordonnance numérique trouvée."))
            return

        for p in prescriptions:
            self.content_column.controls.append(
                ft.Container(
                    padding=ft.Padding.all(14),
                    border_radius=12,
                    bgcolor=MedicalColors.CARD_BG,
                    border=ft.Border.all(1, MedicalColors.BORDER),
                    content=ft.Column(
                        spacing=8,
                        controls=[
                            ft.Row(
                                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                controls=[
                                    ft.Text(f"Dr. {p.doctor.user.last_name}", size=14, weight=ft.FontWeight.BOLD),
                                    ft.Text(p.date_issued.strftime("%d/%m/%Y"), size=11, color=MedicalColors.TEXT_SECONDARY),
                                ]
                            ),
                            ft.Text(f"Diagnostic : {p.diagnosis}", size=12, italic=True),
                            ft.Text(p.content, size=12, color=MedicalColors.TEXT_PRIMARY),
                            ft.Row(
                                alignment=ft.MainAxisAlignment.END,
                                controls=[
                                    ft.ElevatedButton(
                                        "Voir QR Code",
                                        icon=ft.Icons.QR_CODE,
                                        on_click=lambda _, code=p.qr_code_id: self._show_qr_modal(code)
                                    )
                                ]
                            )
                        ]
                    )
                )
            )

    def _show_qr_modal(self, code):
        dialog = ft.AlertDialog(
            title=ft.Text("Ordonnance Digitale"),
            content=ft.Column(
                tight=True,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                controls=[
                    ft.Text("Présentez ce code à votre pharmacien pour délivrance."),
                    ft.Container(
                        margin=ft.Margin.all(20),
                        width=200,
                        height=200,
                        bgcolor="white",
                        border=ft.Border.all(2, "black"),
                        alignment=ft.Alignment.CENTER,
                        content=ft.Icon(ft.Icons.QR_CODE_2, size=150, color="black"),
                    ),
                    ft.Text(f"REF: {code[:8].upper()}", size=12, weight=ft.FontWeight.BOLD),
                ]
            ),
            actions=[ft.TextButton("Fermer", on_click=lambda _: close_modal(self.page, dialog))]
        )
        open_modal(self.page, dialog)

    def _render_reminders(self, db, patient):
        reminders = db.query(PillReminder).filter(PillReminder.patient_id == patient.id).all()

        self.content_column.controls.append(
            ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Text("Rappels de Médicaments", size=14, weight=ft.FontWeight.BOLD),
                    ft.IconButton(ft.Icons.ADD_CIRCLE, icon_color=MedicalColors.PRIMARY, on_click=lambda _: show_toast(self.page, "Ajouter un rappel", MedicalColors.PRIMARY))
                ]
            )
        )

        for r in reminders:
            self.content_column.controls.append(
                ft.Container(
                    padding=ft.Padding.all(12),
                    border_radius=10,
                    bgcolor=MedicalColors.SECONDARY_LIGHT if r.is_active else MedicalColors.BACKGROUND,
                    content=ft.Row(
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        controls=[
                            ft.Row(
                                spacing=12,
                                controls=[
                                    ft.Icon(ft.Icons.NOTIFICATIONS_ACTIVE if r.is_active else ft.Icons.NOTIFICATIONS_OFF, color=MedicalColors.SECONDARY),
                                    ft.Column(
                                        spacing=2,
                                        controls=[
                                            ft.Text(r.medication_name, size=13, weight=ft.FontWeight.BOLD),
                                            ft.Text(f"{r.reminder_time} • {r.dosage}", size=11, color=MedicalColors.TEXT_SECONDARY),
                                        ]
                                    )
                                ]
                            ),
                            ft.Switch(value=r.is_active, active_color=MedicalColors.SECONDARY)
                        ]
                    )
                )
            )

    def _render_blood_donation(self, db):
        requests = db.query(BloodDonationRequest).order_by(BloodDonationRequest.created_at.desc()).all()

        self.content_column.controls.append(
            ft.Container(
                padding=ft.Padding.all(12),
                border_radius=12,
                bgcolor=MedicalColors.EMERGENCY_LIGHT,
                content=ft.Row(
                    spacing=10,
                    controls=[
                        ft.Icon(ft.Icons.WATER_DROP, color=MedicalColors.EMERGENCY),
                        ft.Column(
                            expand=True,
                            controls=[
                                ft.Text("HUB DON DE SANG (GABON)", size=14, weight=ft.FontWeight.BOLD, color=MedicalColors.EMERGENCY),
                                ft.Text("Sauvez des vies en répondant aux appels urgents.", size=11, color=MedicalColors.TEXT_PRIMARY),
                            ]
                        )
                    ]
                )
            )
        )

        for req in requests:
            color = MedicalColors.EMERGENCY if req.urgency_level == "CRITICAL" else MedicalColors.WARNING
            self.content_column.controls.append(
                ft.Container(
                    padding=ft.Padding.all(12),
                    border_radius=12,
                    bgcolor=MedicalColors.CARD_BG,
                    border=ft.Border.all(1, color if req.urgency_level == "CRITICAL" else MedicalColors.BORDER),
                    content=ft.Column(
                        spacing=6,
                        controls=[
                            ft.Row(
                                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                controls=[
                                    ft.Text(f"Groupe : {req.blood_type}", size=16, weight=ft.FontWeight.BOLD, color=MedicalColors.EMERGENCY),
                                    ft.Container(
                                        padding=ft.Padding.symmetric(horizontal=8, vertical=3),
                                        border_radius=6,
                                        bgcolor=color,
                                        content=ft.Text(req.urgency_level, size=10, weight=ft.FontWeight.BOLD, color="white"),
                                    )
                                ]
                            ),
                            ft.Text(req.clinic_name, size=13, weight=ft.FontWeight.W_500),
                            ft.Text(req.description, size=11, color=MedicalColors.TEXT_SECONDARY),
                            ft.ElevatedButton(
                                "Je suis volontaire",
                                icon=ft.Icons.FAVORITE,
                                bgcolor=MedicalColors.EMERGENCY,
                                color="white",
                                on_click=lambda _, r=req: show_toast(self.page, f"Merci ! Contactez le {r.contact_phone}", MedicalColors.SUCCESS)
                            )
                        ]
                    )
                )
            )
