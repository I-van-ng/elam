import flet as ft
from theme.colors import MedicalColors


def create_bottom_nav(selected_index, on_change):
    return ft.NavigationBar(
        selected_index=selected_index,
        on_change=on_change,
        bgcolor="#FFFFFF",
        indicator_color="#ECFDF5",
        elevation=0,
        border=ft.Border.only(top=ft.BorderSide(1, "#E2E8F0")),
        height=66,
        label_behavior=ft.NavigationBarLabelBehavior.ALWAYS_SHOW,
        destinations=[
            ft.NavigationBarDestination(
                icon=ft.Icons.EXPLORE_OUTLINED,
                selected_icon=ft.Icons.EXPLORE_ROUNDED,
                label="Explorer",
            ),
            ft.NavigationBarDestination(
                icon=ft.Icons.MEDICATION_OUTLINED,
                selected_icon=ft.Icons.MEDICATION_ROUNDED,
                label="Pharmacies",
            ),
            ft.NavigationBarDestination(
                icon=ft.Icons.HEALTH_AND_SAFETY_OUTLINED,
                selected_icon=ft.Icons.HEALTH_AND_SAFETY_ROUNDED,
                label="Médecins",
            ),
            ft.NavigationBarDestination(
                icon=ft.Icons.LOCAL_HOSPITAL_OUTLINED,
                selected_icon=ft.Icons.LOCAL_HOSPITAL_ROUNDED,
                label="Hôpitaux",
            ),
            ft.NavigationBarDestination(
                icon=ft.Icons.CALENDAR_MONTH_OUTLINED,
                selected_icon=ft.Icons.CALENDAR_MONTH_ROUNDED,
                label="RDV",
            ),
            ft.NavigationBarDestination(
                icon=ft.Icons.PAYMENTS_OUTLINED,
                selected_icon=ft.Icons.PAYMENTS_ROUNDED,
                label="Tarifs",
            ),
            ft.NavigationBarDestination(
                icon=ft.Icons.ADD_BUSINESS_OUTLINED,
                selected_icon=ft.Icons.ADD_BUSINESS_ROUNDED,
                label="Gérer",
            ),
        ],
    )
