import flet as ft

from components.provider_form_modal import ProviderFormModal
from services.api_client import api_client, ElamApiError
from services.api_models import api_list
from theme.colors import MedicalColors, MedicalStyles
from utils.ui import show_toast, render_then_load


class DirectoryManagementView:
    def __init__(self, page: ft.Page):
        self.page = page
        self.content_column = ft.Column(spacing=14, scroll=ft.ScrollMode.ADAPTIVE)

    def build(self):
        header = ft.Container(
            padding=ft.Padding.symmetric(horizontal=16, vertical=12),
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.only(bottom=ft.BorderSide(1, MedicalColors.BORDER)),
            shadow=MedicalStyles.SHADOW_SM,
            content=ft.Row(
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                controls=[
                    ft.Column(
                        spacing=2,
                        controls=[
                            ft.Text("Administration", size=18, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text("Gestion du référentiel santé ELAM", size=10, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Container(
                        padding=ft.Padding.symmetric(horizontal=9, vertical=5),
                        border_radius=14,
                        bgcolor=MedicalColors.PRIMARY_LIGHT,
                        content=ft.Text("Admin", size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.PRIMARY_DARK),
                    ),
                ],
            ),
        )

        render_then_load(self.page, self.content_column, self.refresh)

        return ft.Column(
            expand=True,
            spacing=0,
            controls=[
                header,
                ft.Container(
                    expand=True,
                    padding=ft.Padding.all(16),
                    content=self.content_column,
                ),
            ],
        )

    def refresh(self):
        self.content_column.controls.clear()

        # Les compteurs sont derives des listes de l'API : le backend n'expose
        # pas d'endpoint de statistiques admin, mais les donnees sont les memes
        # que celles du referentiel central.
        try:
            doctors = api_list(api_client.get_doctors())
            pharmacies = api_list(api_client.get_pharmacies())
            clinics = api_list(api_client.get_clinics())
        except ElamApiError as exc:
            show_toast(self.page, exc.message, MedicalColors.EMERGENCY)
            self.content_column.controls.append(
                ft.Text("Référentiel indisponible : %s" % exc.message, size=12, color=MedicalColors.EMERGENCY)
            )
            if self.page:
                self.page.update()
            return

        doctors_count = len(doctors)
        pharmacies_count = len(pharmacies)
        clinics_count = len(clinics)
        latest_doctor_names = [self._doctor_name(d) for d in doctors[:3]]
        latest_pharmacy_names = [p.name for p in pharmacies[:3]]
        latest_clinic_names = [c.name for c in clinics[:3]]

        self.content_column.controls.extend([
            ft.Row(
                spacing=8,
                controls=[
                    self._metric("Médecins", doctors_count, MedicalColors.SECONDARY),
                    self._metric("Pharmacies", pharmacies_count, MedicalColors.PRIMARY),
                    self._metric("Urgences", clinics_count, MedicalColors.EMERGENCY),
                ],
            ),
            ft.Text("Ajouter au référentiel", size=13, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
            self._action_card(
                "Ajouter médecin",
                "Profil, spécialité, tarif, CNAMGS et position GPS.",
                ft.Icons.HEALTH_AND_SAFETY_ROUNDED,
                MedicalColors.SECONDARY,
                lambda _: ProviderFormModal(self.page, "doctor", on_success=self.refresh).show(),
            ),
            self._action_card(
                "Ajouter pharmacie",
                "Officine, horaires, garde, CNAMGS et géolocalisation.",
                ft.Icons.LOCAL_PHARMACY_ROUNDED,
                MedicalColors.PRIMARY,
                lambda _: ProviderFormModal(self.page, "pharmacy", on_success=self.refresh).show(),
            ),
            self._action_card(
                "Ajouter hôpital",
                "Urgences 24/7, services, téléphone et localisation.",
                ft.Icons.LOCAL_HOSPITAL_ROUNDED,
                MedicalColors.EMERGENCY,
                lambda _: ProviderFormModal(self.page, "clinic", on_success=self.refresh).show(),
            ),
            ft.Divider(height=1, color=MedicalColors.BORDER),
            ft.Text("Dernières entrées", size=13, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
            self._section("Médecins", latest_doctor_names, MedicalColors.SECONDARY),
            self._section("Pharmacies", latest_pharmacy_names, MedicalColors.PRIMARY),
            self._section("Établissements", latest_clinic_names, MedicalColors.EMERGENCY),
        ])

        if self.page:
            self.page.update()

    def _metric(self, label: str, value: int, color: str):
        return ft.Container(
            expand=True,
            padding=ft.Padding.all(12),
            border_radius=14,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            content=ft.Column(
                spacing=2,
                controls=[
                    ft.Text(str(value), size=22, weight=ft.FontWeight.W_900, color=color),
                    ft.Text(label, size=10, weight=ft.FontWeight.BOLD, color=MedicalColors.TEXT_SECONDARY),
                ],
            ),
        )

    def _action_card(self, title: str, subtitle: str, icon, color: str, on_click):
        return ft.Container(
            padding=ft.Padding.all(14),
            border_radius=18,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            shadow=MedicalStyles.SHADOW_SM,
            ink=True,
            on_click=on_click,
            content=ft.Row(
                spacing=12,
                controls=[
                    ft.Container(
                        width=46,
                        height=46,
                        border_radius=15,
                        bgcolor=MedicalColors.SURFACE_VARIANT,
                        alignment=ft.Alignment.CENTER,
                        content=ft.Icon(icon, color=color, size=24),
                    ),
                    ft.Column(
                        expand=True,
                        spacing=3,
                        controls=[
                            ft.Text(title, size=13, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                            ft.Text(subtitle, size=10, color=MedicalColors.TEXT_SECONDARY),
                        ],
                    ),
                    ft.Icon(ft.Icons.ADD_ROUNDED, color=color, size=22),
                ],
            ),
        )

    def _section(self, title: str, names: list[str], color: str):
        items = names or ["Aucune entrée"]
        return ft.Container(
            padding=ft.Padding.all(12),
            border_radius=14,
            bgcolor=MedicalColors.CARD_BG,
            border=ft.Border.all(1, MedicalColors.BORDER),
            content=ft.Column(
                spacing=7,
                controls=[
                    ft.Text(title, size=11, weight=ft.FontWeight.W_900, color=color),
                    *[ft.Text(name, size=11, color=MedicalColors.TEXT_PRIMARY) for name in items],
                ],
            ),
        )

    def _doctor_name(self, doctor):
        """Accepte un objet adapte de l'API (doctor.user / doctor.title)."""
        if getattr(doctor, "user", None):
            return f"{doctor.title} {doctor.user.first_name} {doctor.user.last_name}"
        return "Dr. Spécialiste"
