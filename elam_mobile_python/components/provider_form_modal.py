import re
import time
import flet as ft

from services.api_client import api_client
from theme.colors import MedicalColors
from utils.ui import close_modal, open_modal, show_toast


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", ".", (value or "").lower()).strip(".")
    return cleaned or str(int(time.time()))


class ProviderFormModal:
    def __init__(self, page: ft.Page, provider_type: str, on_success=None):
        self.page = page
        self.provider_type = provider_type
        self.on_success = on_success
        self.dialog = None
        self.fields = {}

    def show(self):
        title_map = {
            "doctor": "Ajouter un médecin / kiné",
            "pharmacy": "Ajouter une pharmacie",
            "clinic": "Ajouter un hôpital ou une clinique",
        }
        icon_map = {
            "doctor": ft.Icons.MEDICAL_SERVICES_ROUNDED,
            "pharmacy": ft.Icons.LOCAL_PHARMACY_ROUNDED,
            "clinic": ft.Icons.LOCAL_HOSPITAL_ROUNDED,
        }

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
                                content=ft.Icon(icon_map[self.provider_type], color="white", size=23),
                            ),
                            ft.Column(
                                spacing=2,
                                controls=[
                                    ft.Text(title_map[self.provider_type], size=15, weight=ft.FontWeight.W_900, color=MedicalColors.TEXT_PRIMARY),
                                    ft.Text("Les informations sont enregistrées en local dans SQLite.", size=10, color=MedicalColors.TEXT_SECONDARY),
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
            width=390,
            content=ft.Column(
                tight=True,
                spacing=12,
                controls=[
                    ft.Column(spacing=10, height=420, scroll=ft.ScrollMode.ADAPTIVE, controls=self._build_fields()),
                    ft.ElevatedButton(
                        "Enregistrer",
                        icon=ft.Icons.SAVE_ROUNDED,
                        bgcolor=MedicalColors.PRIMARY,
                        color="#FFFFFF",
                        width=390,
                        style=ft.ButtonStyle(
                            shape=ft.RoundedRectangleBorder(radius=12),
                            padding=ft.Padding.symmetric(vertical=14),
                        ),
                        on_click=self._submit,
                    ),
                ],
            ),
        )

        self.dialog = ft.AlertDialog(
            content_padding=ft.Padding.all(0),
            shape=ft.RoundedRectangleBorder(radius=20),
            content=ft.Column(tight=True, spacing=0, controls=[header, body]),
        )
        open_modal(self.page, self.dialog)

    def _text(self, key: str, label: str, value: str = "", keyboard_type=None):
        field = ft.TextField(
            label=label,
            value=value,
            dense=True,
            bgcolor=MedicalColors.CARD_BG,
            border_color=MedicalColors.BORDER,
            border_radius=12,
            keyboard_type=keyboard_type,
        )
        self.fields[key] = field
        return field

    def _check(self, key: str, label: str, value: bool = True):
        field = ft.Checkbox(label=label, value=value, active_color=MedicalColors.PRIMARY)
        self.fields[key] = field
        return field

    def _dropdown(self, key: str, label: str, options: list, value: str):
        field = ft.Dropdown(
            label=label,
            value=value,
            dense=True,
            bgcolor=MedicalColors.CARD_BG,
            border_color=MedicalColors.BORDER,
            border_radius=12,
            options=[ft.dropdown.Option(v) for v in options],
        )
        self.fields[key] = field
        return field

    def _build_fields(self):
        common_location = [
            self._text("address", "Adresse"),
            self._text("district", "Quartier", "Centre-ville"),
            self._text("city", "Ville", "Libreville"),
            ft.Row(
                spacing=8,
                controls=[
                    self._text("latitude", "Latitude", "0.391", ft.KeyboardType.NUMBER),
                    self._text("longitude", "Longitude", "9.449", ft.KeyboardType.NUMBER),
                ],
            ),
        ]

        if self.provider_type == "doctor":
            return [
                self._dropdown("title", "Titre", ["Dr.", "Pr.", "M.", "Mme"], "Dr."),
                ft.Row(spacing=8, controls=[self._text("first_name", "Prénom"), self._text("last_name", "Nom")]),
                self._dropdown(
                    "specialty",
                    "Spécialité",
                    ["Médecine Générale", "Cardiologie", "Pédiatrie", "Gynécologie", "Ophtalmologie", "Kinésithérapie", "Dentiste"],
                    "Médecine Générale",
                ),
                self._text("sub_specialties", "Expertises", "Consultation, suivi patient"),
                self._text("cnom_number", "Numéro CNOM / ordre professionnel"),
                self._text("phone", "Téléphone", "+241 "),
                self._text("email", "Email (auto si vide)"),
                *common_location,
                self._text("consultation_fee", "Tarif consultation FCFA", "15000", ft.KeyboardType.NUMBER),
                self._check("accepts_cnamgs", "Accepte CNAMGS", True),
                self._check("accepts_teleconsult", "Téléconsultation disponible", False),
                self._check("accepts_home_visit", "Visite à domicile", False),
                self._text("bio", "Bio courte", "Professionnel de santé disponible sur ELAM."),
            ]

        if self.provider_type == "pharmacy":
            return [
                self._text("name", "Nom de la pharmacie"),
                self._text("license_number", "Numéro d'agrément"),
                self._text("phone", "Téléphone", "+241 "),
                self._text("email", "Email (auto si vide)"),
                *common_location,
                self._text("opening_hours", "Horaires", "08h00 - 20h00"),
                self._check("is_on_duty", "Pharmacie de garde", False),
                self._check("accepts_cnamgs", "Accepte CNAMGS", True),
            ]

        return [
            self._text("name", "Nom de l'établissement"),
            self._dropdown("type", "Type", ["HOSPITAL", "CLINIC", "LAB"], "CLINIC"),
            self._text("phone", "Téléphone", "+241 "),
            self._text("emergency_phone", "Téléphone urgence", "1300"),
            *common_location,
            self._text("services_list", "Services", "Urgences, Médecine générale"),
            self._check("has_emergency_247", "Urgences 24/7", True),
            self._check("accepts_cnamgs", "Accepte CNAMGS", True),
        ]

    def _values(self):
        values = {}
        for key, field in self.fields.items():
            values[key] = field.value
        return values

    def _submit(self, _):
        data = self._values()
        try:
            self._normalize_and_validate(data)
            if self.provider_type == "doctor":
                api_client.add_doctor(data)
                message = "Médecin / kiné ajouté avec succès."
            elif self.provider_type == "pharmacy":
                api_client.add_pharmacy(data)
                message = "Pharmacie ajoutée avec succès."
            else:
                api_client.add_clinic(data)
                message = "Établissement ajouté avec succès."

            close_modal(self.page, self.dialog)
            show_toast(self.page, message, MedicalColors.SUCCESS)
            if self.on_success:
                self.on_success()
        except Exception as ex:
            show_toast(self.page, f"Impossible d'enregistrer : {ex}", MedicalColors.EMERGENCY)

    def _normalize_and_validate(self, data: dict):
        required_by_type = {
            "doctor": ["first_name", "last_name", "phone", "specialty", "address"],
            "pharmacy": ["name", "phone", "address"],
            "clinic": ["name", "phone", "address"],
        }
        missing = [key for key in required_by_type[self.provider_type] if not str(data.get(key) or "").strip()]
        if missing:
            raise ValueError("champs obligatoires manquants")

        if self.provider_type == "doctor" and not data.get("email"):
            data["email"] = f"{_slug(data['first_name'])}.{_slug(data['last_name'])}.{int(time.time())}@elam.local"
        elif self.provider_type in ("pharmacy", "clinic") and not data.get("email"):
            data["email"] = f"{_slug(data['name'])}.{int(time.time())}@elam.local"
