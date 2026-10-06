import threading

import flet as ft


def show_toast(page: ft.Page, message: str, color=None):
    snack = ft.SnackBar(content=ft.Text(message, color="white"), bgcolor=color, open=True)
    if hasattr(page, "show_dialog"):
        page.show_dialog(snack)
    elif hasattr(page, "overlay"):
        page.overlay.append(snack)
        snack.open = True
    page.update()


def loading_control(message: str = "Chargement des données..."):
    """Indicateur affiche pendant que les donnees arrivent de l'API."""
    return ft.Container(
        padding=ft.Padding.all(22),
        alignment=ft.Alignment.CENTER,
        content=ft.Row(
            alignment=ft.MainAxisAlignment.CENTER,
            tight=True,
            spacing=10,
            controls=[
                ft.ProgressRing(width=18, height=18, stroke_width=2, color="#059669"),
                ft.Text(message, size=12, color="#64748B"),
            ],
        ),
    )


def render_then_load(page: ft.Page, column: ft.Column, loader, message: str = "Chargement des données..."):
    """Affiche tout de suite un indicateur, puis charge en arriere-plan.

    Sans cela, chaque appel a l'API bloquait le fil de l'interface : l'ecran
    restait fige jusqu'a la reponse (jusqu'a plusieurs secondes si le backend
    ne repond pas).
    """
    try:
        column.controls.clear()
        column.controls.append(loading_control(message))
        if page:
            page.update()
    except Exception:
        pass

    # Flet expose sa propre API de thread : on la prefere quand elle existe,
    # sinon on retombe sur un thread standard.
    if page is not None and hasattr(page, "run_thread"):
        page.run_thread(loader)
    else:
        threading.Thread(target=loader, daemon=True).start()


def open_modal(page: ft.Page, dialog: ft.AlertDialog):
    if hasattr(page, "show_dialog"):
        page.show_dialog(dialog)
    elif hasattr(page, "overlay"):
        page.overlay.append(dialog)
        dialog.open = True
    page.update()


def close_modal(page: ft.Page, dialog=None):
    if hasattr(page, "pop_dialog"):
        page.pop_dialog()
    elif dialog:
        dialog.open = False
    page.update()
