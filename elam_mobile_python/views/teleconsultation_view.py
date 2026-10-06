import uuid
import datetime
import flet as ft
from theme.colors import MedicalColors
from utils.ui import show_toast, open_modal, close_modal
from data.database import SessionLocal
from data.models import Prescription, User, PatientProfile, DoctorProfile


class TeleconsultationView:
    def __init__(self, page: ft.Page, doctor_name="Dr. Alain Minko", specialty="Cardiologie", on_end_call=None):
        self.page = page
        self.doctor_name = doctor_name
        self.specialty = specialty
        self.on_end_call = on_end_call

        self.is_mic_muted = False
        self.is_cam_off = False
        self.call_duration_seconds = 0
        self.timer_text = ft.Text("00:00", size=13, weight=ft.FontWeight.BOLD, color="white")

        self.chat_messages = [
            {"sender": "Système", "text": "🔒 Session médicale chiffrée de bout en bout (Conforme CNOM / RGPD Santé).", "time": "10:30"},
            {"sender": self.doctor_name, "text": "Bonjour Hans, je vous écoute pour votre suivi tensionnel.", "time": "10:31"},
        ]
        self.chat_column = ft.Column(spacing=6, scroll=ft.ScrollMode.ADAPTIVE)

    def build(self):
        # Top Call Status Bar
        top_bar = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=10),
            bgcolor="#0F172A",
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Row(
                        spacing=8,
                        controls=[
                            ft.Container(
                                width=10,
                                height=10,
                                border_radius=5,
                                bgcolor="#22C55E",
                            ),
                            ft.Text("EN DIRECT", size=11, weight=ft.FontWeight.BOLD, color="#22C55E"),
                            ft.Text("•", color="#64748B"),
                            self.timer_text,
                        ],
                    ),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=8, vertical=3),
                        border_radius=6,
                        bgcolor="#1E293B",
                        content=ft.Row(
                            spacing=4,
                            controls=[
                                ft.Icon(ft.Icons.LOCK, size=12, color="#38BDF8"),
                                ft.Text("HD 1080p Chiffré", size=10, color="#38BDF8", weight=ft.FontWeight.BOLD),
                            ],
                        ),
                    ),
                ],
            ),
        )

        # Doctor Video Main Feed (Simulated Medical Feed)
        doctor_video_feed = ft.Container(
            expand=2,
            bgcolor="#1E293B",
            border_radius=16,
            alignment=ft.Alignment.CENTER,
            content=ft.Stack(
                controls=[
                    # Simulated Video Canvas
                    ft.Container(
                        alignment=ft.Alignment.CENTER,
                        content=ft.Column(
                            alignment=ft.MainAxisAlignment.CENTER,
                            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                            spacing=8,
                            controls=[
                                ft.Container(
                                    width=90,
                                    height=90,
                                    border_radius=45,
                                    bgcolor=MedicalColors.PRIMARY,
                                    border=ft.Border.all(3, "#38BDF8"),
                                    alignment=ft.Alignment.CENTER,
                                    content=ft.Icon(ft.Icons.MEDICAL_SERVICES, size=50, color="white"),
                                ),
                                ft.Text(self.doctor_name, size=16, weight=ft.FontWeight.BOLD, color="white"),
                                ft.Text(f"Spécialiste en {self.specialty} • En consultation", size=12, color="#94A3B8"),
                            ],
                        ),
                    ),
                    # Patient Pip Camera (Bottom Right)
                    ft.Container(
                        right=12,
                        bottom=12,
                        width=100,
                        height=130,
                        border_radius=12,
                        bgcolor="#0F172A",
                        border=ft.Border.all(2, "white"),
                        padding=ft.Padding.all(6),
                        content=ft.Column(
                            alignment=ft.MainAxisAlignment.CENTER,
                            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                            spacing=4,
                            controls=[
                                ft.Icon(ft.Icons.PERSON, color="white", size=30),
                                ft.Text("Vous (Hans)", size=10, color="white", weight=ft.FontWeight.BOLD),
                                ft.Container(
                                    padding=ft.Padding.symmetric(horizontal=4, vertical=1),
                                    border_radius=4,
                                    bgcolor="#22C55E",
                                    content=ft.Text("Micro Actif", size=8, color="white"),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
        )

        # In-call Controls (Mute, Camera, Prescription Generator, End Call)
        mic_btn = ft.IconButton(
            ft.Icons.MIC,
            icon_color="white",
            bgcolor="#334155",
            icon_size=22,
            tooltip="Activer/Couper Micro",
            on_click=lambda e: self._toggle_mic(e.control),
        )

        cam_btn = ft.IconButton(
            ft.Icons.VIDEOCAM,
            icon_color="white",
            bgcolor="#334155",
            icon_size=22,
            tooltip="Activer/Couper Caméra",
            on_click=lambda e: self._toggle_cam(e.control),
        )

        rx_btn = ft.ElevatedButton(
            "Ordonnance Digitale ✍️",
            icon=ft.Icons.NOTE_ADD,
            bgcolor=MedicalColors.PRIMARY,
            color="white",
            style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=10)),
            on_click=lambda _: self._open_prescription_issuer_modal(),
        )

        end_btn = ft.IconButton(
            ft.Icons.CALL_END,
            icon_color="white",
            bgcolor=MedicalColors.EMERGENCY,
            icon_size=24,
            tooltip="Terminer la consultation",
            on_click=lambda _: self._end_call(),
        )

        controls_bar = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=10),
            bgcolor="#0F172A",
            border_radius=14,
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_AROUND,
                controls=[mic_btn, cam_btn, rx_btn, end_btn],
            ),
        )

        # Chat / Notes Section
        self._refresh_chat()
        chat_section = ft.Container(
            expand=1,
            padding=ft.Padding.all(12),
            bgcolor=MedicalColors.CARD_BG,
            border_radius=14,
            border=ft.Border.all(1, MedicalColors.BORDER),
            content=ft.Column(
                expand=True,
                spacing=8,
                controls=[
                    ft.Text("Messagerie & Documents partagés :", size=12, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_PRIMARY),
                    ft.Container(expand=True, content=self.chat_column),
                    self._build_chat_input(),
                ],
            ),
        )

        return ft.Container(
            expand=True,
            bgcolor="#020617",
            padding=ft.Padding.all(12),
            content=ft.Column(
                expand=True,
                spacing=10,
                controls=[
                    top_bar,
                    doctor_video_feed,
                    controls_bar,
                    chat_section,
                ],
            ),
        )

    def _toggle_mic(self, btn):
        self.is_mic_muted = not self.is_mic_muted
        btn.icon = ft.Icons.MIC_OFF if self.is_mic_muted else ft.Icons.MIC
        btn.bgcolor = MedicalColors.EMERGENCY if self.is_mic_muted else "#334155"
        show_toast(self.page, "Micro coupé" if self.is_mic_muted else "Micro réactivé", MedicalColors.TEXT_SECONDARY)
        self.page.update()

    def _toggle_cam(self, btn):
        self.is_cam_off = not self.is_cam_off
        btn.icon = ft.Icons.VIDEOCAM_OFF if self.is_cam_off else ft.Icons.VIDEOCAM
        btn.bgcolor = MedicalColors.EMERGENCY if self.is_cam_off else "#334155"
        show_toast(self.page, "Caméra désactivée" if self.is_cam_off else "Caméra activée", MedicalColors.TEXT_SECONDARY)
        self.page.update()

    def _refresh_chat(self):
        self.chat_column.controls.clear()
        for msg in self.chat_messages:
            is_doctor = msg["sender"] == self.doctor_name
            self.chat_column.controls.append(
                ft.Container(
                    padding=ft.Padding.all(8),
                    border_radius=8,
                    bgcolor=MedicalColors.PRIMARY_LIGHT if is_doctor else MedicalColors.BACKGROUND,
                    content=ft.Column(
                        spacing=2,
                        controls=[
                            ft.Row(
                                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                controls=[
                                    ft.Text(msg["sender"], size=11, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK if is_doctor else MedicalColors.TEXT_PRIMARY),
                                    ft.Text(msg["time"], size=9, color=MedicalColors.TEXT_MUTED),
                                ],
                            ),
                            ft.Text(msg["text"], size=11, color=MedicalColors.TEXT_PRIMARY),
                        ],
                    ),
                )
            )

    def _build_chat_input(self):
        msg_input = ft.TextField(
            hint_text="Écrire un message ou poser une question...",
            dense=True,
            expand=True,
        )

        def send_msg(_):
            if msg_input.value:
                self.chat_messages.append({
                    "sender": "Hans (Patient)",
                    "text": msg_input.value,
                    "time": datetime.datetime.now().strftime("%H:%M"),
                })
                msg_input.value = ""
                self._refresh_chat()
                self.page.update()

        return ft.Row(
            spacing=6,
            controls=[
                msg_input,
                ft.IconButton(ft.Icons.SEND, icon_color=MedicalColors.PRIMARY, on_click=send_msg),
            ],
        )

    def _open_prescription_issuer_modal(self):
        diag_field = ft.TextField(label="Diagnostic Médical", value="Suivi tensionnel — Hypertension stabilisée", dense=True)
        content_field = ft.TextField(
            label="Médicaments prescrits & Posologie",
            value="1. Amlodipine 5mg : 1 comprimé le matin\n2. Bilan lipidique de contrôle sous 3 mois",
            multiline=True,
            min_lines=3,
            dense=True,
        )

        def do_issue(_):
            db = SessionLocal()
            try:
                patient = db.query(PatientProfile).first()
                doctor = db.query(DoctorProfile).first()

                if patient and doctor:
                    rx = Prescription(
                        patient_id=patient.id,
                        doctor_id=doctor.id,
                        diagnosis=diag_field.value,
                        content=content_field.value,
                        status="ACTIVE",
                    )
                    db.add(rx)
                    db.commit()

                    self.chat_messages.append({
                        "sender": self.doctor_name,
                        "text": f"📋 Nouvelle ordonnance émise : {diag_field.value} (Code QR généré).",
                        "time": datetime.datetime.now().strftime("%H:%M"),
                    })
                    self._refresh_chat()

                close_modal(self.page, dialog)
                self._show_rx_success_modal(diag_field.value, content_field.value)
            finally:
                db.close()

        dialog = ft.AlertDialog(
            title=ft.Row(
                spacing=6,
                controls=[
                    ft.Icon(ft.Icons.BORDER_COLOR, color=MedicalColors.PRIMARY),
                    ft.Text("Émettre une Ordonnance Digitale", size=15, weight=ft.FontWeight.BOLD),
                ],
            ),
            content=ft.Column(
                tight=True,
                spacing=10,
                controls=[
                    ft.Text(f"Praticien : {self.doctor_name} • Patient : Hans Mba Ndong", size=12, color=MedicalColors.TEXT_SECONDARY),
                    diag_field,
                    content_field,
                ],
            ),
            actions=[
                ft.TextButton("Annuler", on_click=lambda _: close_modal(self.page, dialog)),
                ft.ElevatedButton("Signer & Délivrer", bgcolor=MedicalColors.PRIMARY, color="white", on_click=do_issue),
            ],
        )
        open_modal(self.page, dialog)

    def _show_rx_success_modal(self, diag, content):
        rx_dialog = ft.AlertDialog(
            title=ft.Text("Ordonnance Digitale Signée 🇬🇦"),
            content=ft.Container(
                width=340,
                content=ft.Column(
                    tight=True,
                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                    spacing=10,
                    controls=[
                        ft.Icon(ft.Icons.CHECK_CIRCLE, color=MedicalColors.SUCCESS, size=40),
                        ft.Text("Ordonnance enregistrée sur votre Carnet de Santé.", size=13, weight=ft.FontWeight.BOLD),
                        ft.Container(
                            padding=ft.Padding.all(10),
                            border_radius=8,
                            bgcolor=MedicalColors.PRIMARY_LIGHT,
                            content=ft.Column(
                                spacing=4,
                                controls=[
                                    ft.Text(f"Diagnostic : {diag}", size=12, weight=ft.FontWeight.BOLD),
                                    ft.Text(content, size=11),
                                ],
                            ),
                        ),
                        ft.Container(
                            width=140,
                            height=140,
                            border=ft.Border.all(2, "black"),
                            alignment=ft.Alignment.CENTER,
                            content=ft.Icon(ft.Icons.QR_CODE_2, size=110, color="black"),
                        ),
                        ft.Text("Présentez ce QR Code en pharmacie de garde pour délivrance.", size=10, color=MedicalColors.TEXT_SECONDARY, text_align=ft.TextAlign.CENTER),
                    ],
                ),
            ),
            actions=[
                ft.ElevatedButton("Fermer", bgcolor=MedicalColors.PRIMARY, color="white", on_click=lambda _: close_modal(self.page, rx_dialog)),
            ],
        )
        open_modal(self.page, rx_dialog)

    def _end_call(self):
        show_toast(self.page, "📞 Téléconsultation terminée. Compte-rendu enregistré.", MedicalColors.PRIMARY)
        if self.on_end_call:
            self.on_end_call()
