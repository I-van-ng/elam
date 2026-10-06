import os
import sys
import argparse
import threading

# Ensure current module directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import flet as ft
from data.seed import seed_database
from theme.colors import MedicalColors
from components.bottom_nav import create_bottom_nav
from views.home_view import HomeView
from views.pharmacy_view import PharmacyView
from views.doctor_view import DoctorView
from views.clinics_view import ClinicsView
from views.appointments_view import AppointmentsView
from views.portal_view import PortalView
from views.prescription_scanner_view import PrescriptionScannerView
from views.teleconsultation_view import TeleconsultationView
from views.directory_management_view import DirectoryManagementView
from components.login_view import LoginView
from services.api_client import api_client


def main(page: ft.Page):
    # Initialize seed database
    seed_database()

    # Mobile preview window
    page.title = "ELAM Santé — Web/Backend Sync"
    page.window.width = 440
    page.window.height = 880
    page.window.min_width = 360
    page.window.min_height = 640
    page.window.resizable = True
    page.window.prevent_close = False
    page.theme_mode = ft.ThemeMode.LIGHT
    page.theme = ft.Theme(color_scheme_seed=MedicalColors.PRIMARY)
    page.bgcolor = MedicalColors.BACKGROUND
    page.padding = 0
    page.spacing = 0

    loading_overlay = ft.Container(
        expand=True,
        bgcolor="#020617",
        alignment=ft.Alignment.CENTER,
        content=ft.Column(
            tight=True,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            spacing=14,
            controls=[
                ft.Container(
                    width=78,
                    height=78,
                    border_radius=26,
                    gradient=ft.LinearGradient(
                        colors=["#34D399", "#14B8A6"],
                        begin=ft.Alignment.TOP_LEFT,
                        end=ft.Alignment.BOTTOM_RIGHT,
                    ),
                    alignment=ft.Alignment.CENTER,
                    content=ft.Icon(ft.Icons.MONITOR_HEART_ROUNDED, size=42, color="white"),
                ),
                ft.Text("ELAM", size=30, weight=ft.FontWeight.W_900, color="white"),
                ft.Text("Chargement de votre santé connectée...", size=13, color="#CBD5E1"),
                ft.ProgressBar(width=230, color="#2DD4BF", bgcolor="#1E293B"),
            ],
        ),
    )

    # Views initialization
    current_index = 0
    special_mode = None  # "SCANNER" or "TELECONSULTATION"
    teleconsult_doc = "Dr. Alain Minko"
    teleconsult_spec = "Cardiologie"

    def toggle_theme():
        """Switch between the light and dark clinical themes."""
        MedicalColors.set_theme(not MedicalColors.IS_DARK)
        page.theme_mode = ft.ThemeMode.DARK if MedicalColors.IS_DARK else ft.ThemeMode.LIGHT
        page.bgcolor = MedicalColors.BACKGROUND
        page.navigation_bar = create_bottom_nav(current_index, on_nav_change)
        update_view()

    def navigate_to_tab(index: int):
        nonlocal current_index, special_mode
        special_mode = None
        current_index = index
        page.navigation_bar.selected_index = index
        page.navigation_bar.visible = True
        update_view()

    def open_scanner():
        nonlocal special_mode
        special_mode = "SCANNER"
        page.navigation_bar.visible = False
        update_view()

    def open_teleconsult(doc_name="Dr. Alain Minko", spec="Cardiologie"):
        nonlocal special_mode, teleconsult_doc, teleconsult_spec
        special_mode = "TELECONSULTATION"
        teleconsult_doc = doc_name
        teleconsult_spec = spec
        page.navigation_bar.visible = False
        update_view()

    home_view = HomeView(
        page,
        on_navigate_tab=navigate_to_tab,
        on_open_scanner=open_scanner,
        on_open_teleconsult=open_teleconsult,
        on_toggle_theme=toggle_theme,
    )
    pharmacy_view = PharmacyView(page)
    doctor_view = DoctorView(page, on_booking_success=lambda: navigate_to_tab(4), on_open_teleconsult=open_teleconsult)
    clinics_view = ClinicsView(page)
    appointments_view = AppointmentsView(page, on_open_teleconsult=open_teleconsult)
    portal_view = PortalView(page)
    directory_management_view = DirectoryManagementView(page)
    scanner_view = PrescriptionScannerView(page, on_back=lambda: navigate_to_tab(0))

    view_container = ft.Container(expand=True)

    def update_view():
        if special_mode == "SCANNER":
            view_container.content = scanner_view.build()
        elif special_mode == "TELECONSULTATION":
            tc_view = TeleconsultationView(
                page,
                doctor_name=teleconsult_doc,
                specialty=teleconsult_spec,
                on_end_call=lambda: navigate_to_tab(4),
            )
            view_container.content = tc_view.build()
        elif current_index == 0:
            view_container.content = home_view.build()
        elif current_index == 1:
            view_container.content = pharmacy_view.build()
        elif current_index == 2:
            view_container.content = doctor_view.build()
        elif current_index == 3:
            view_container.content = clinics_view.build()
        elif current_index == 4:
            view_container.content = appointments_view.build()
        elif current_index == 5:
            view_container.content = portal_view.build()
        elif current_index == 6:
            view_container.content = directory_management_view.build()
        page.update()

    def on_nav_change(e):
        nonlocal current_index, special_mode
        special_mode = None
        current_index = e.control.selected_index
        update_view()

    # ------------------------------------------------------------------
    # Demarrage : on tente de reprendre la session enregistree (token JWT),
    # sinon on affiche l'ecran de connexion. Comme le site web, mais explicite.
    # ------------------------------------------------------------------
    def finish_boot():
        """Affiche l'application : navigation + premier ecran."""
        page.navigation_bar = create_bottom_nav(current_index, on_nav_change)
        page.navigation_bar.visible = True
        page.navigation_bar.selected_index = current_index
        update_view()

    def show_login():
        """Affiche l'ecran de connexion (aucune barre de navigation)."""
        page.navigation_bar = None
        view_container.content = LoginView(page, on_success=finish_boot).build()
        page.update()

    def try_restore_session():
        # Prechauffage : la premiere connexion d'un processus Windows peut couter
        # 1 a 2 s. On la paie ici, pendant l'ecran de chargement, pas devant l'utilisateur.
        api_client.warm_up()
        try:
            user = api_client.restore_session()
        except Exception as exc:
            print(f"[ELAM] Reprise de session impossible : {exc}")
            user = None
        if user:
            print(f"[ELAM] Session reprise : {user.get('email')} ({user.get('role')})")
            finish_boot()
        else:
            show_login()

    # Main layout : overlay de chargement, puis session ou connexion
    page.add(view_container)
    view_container.content = loading_overlay
    page.update()

    threading.Thread(target=try_restore_session, daemon=True).start()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ELAM Santé — Application Médicale Gabon")
    parser.add_argument("--web", action="store_true", help="Lancer en mode web (navigateur)")
    parser.add_argument("--port", type=int, default=8550, help="Port web (défaut: 8550)")
    args = parser.parse_args()

    print("==================================================")
    print(" ELAM SANTE - Le Waze de la Sante au Gabon")
    print(" Interface mobile | Triage | GPS | Mobile Money")
    print("==================================================")

    assets_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")

    if args.web:
        print(f" Mode WEB  — http://localhost:{args.port}")
        print(" Partagez avec ngrok : ngrok http", args.port)
        print("==================================================")
        ft.run(main, view=ft.AppView.WEB_BROWSER, port=args.port, assets_dir=assets_path)
    else:
        print(" Mode BUREAU — Fenêtre native")
        print("==================================================")
        ft.run(main, assets_dir=assets_path)
