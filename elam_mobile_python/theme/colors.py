# pyrefly: ignore [missing-import]
import flet as ft


class MedicalColors:
    # Light mode is the default and matches the Web Frontend (Slate 50 + Emerald + Slate 900)
    IS_DARK = False

    # Slate 50 Clinical Palette (Matches Tailwind Web Frontend)
    LIGHT_PALETTE = {
        "BACKGROUND": "#F8FAFC",       # Slate 50 (Web page background)
        "CARD_BG": "#FFFFFF",          # Pure white cards
        "CARD_BG_HOVER": "#F1F5F9",    # Slate 100
        "SURFACE_VARIANT": "#F1F5F9",  # Slate 100
        "BORDER": "#E2E8F0",           # Slate 200 border
        "BORDER_SUBTLE": "#F1F5F9",    # Slate 100 border
        "PRIMARY": "#059669",          # Emerald 600 (Web primary)
        "PRIMARY_LIGHT": "#ECFDF5",    # Emerald 50 (Web pill/badge bg)
        "PRIMARY_DARK": "#047857",     # Emerald 700
        "PRIMARY_ACCENT": "#10B981",   # Emerald 500
        "SECONDARY": "#2563EB",        # Blue 600 (Doctor / Info)
        "SECONDARY_LIGHT": "#EFF6FF",  # Blue 50
        "SECONDARY_DARK": "#1D4ED8",   # Blue 700
        "EMERGENCY": "#E11D48",        # Rose 600 (SAMU 1300)
        "EMERGENCY_LIGHT": "#FFF1F2",  # Rose 50
        "DUTY_GOLD": "#D97706",        # Amber 600 (Garde 24/7)
        "DUTY_LIGHT": "#FEF3C7",       # Amber 100
        "TEXT_PRIMARY": "#0F172A",     # Slate 900
        "TEXT_SECONDARY": "#64748B",   # Slate 500
        "TEXT_MUTED": "#94A3B8",       # Slate 400
        "AIRTEL_RED": "#E60000",
        "AIRTEL_BG": "#FEE2E2",
        "MOOV_BLUE": "#0054A6",
        "MOOV_GOLD": "#F7A800",
        "MOOV_BG": "#E0F2FE",
        "SUCCESS": "#059669",          # Emerald 600
        "SUCCESS_BG": "#ECFDF5",
        "WARNING": "#D97706",          # Amber 600
        "WARNING_BG": "#FEF3C7",
        "INFO": "#2563EB",             # Blue 600
        "INFO_BG": "#EFF6FF",
    }

    # Dark Clinical Palette
    DARK_PALETTE = {
        "BACKGROUND": "#0F172A",       # Slate 900
        "CARD_BG": "#1E293B",          # Slate 800
        "CARD_BG_HOVER": "#334155",    # Slate 700
        "SURFACE_VARIANT": "#1E293B",
        "BORDER": "#334155",           # Slate 700
        "BORDER_SUBTLE": "#1E293B",
        "PRIMARY": "#10B981",          # Emerald 500
        "PRIMARY_LIGHT": "#064E3B",    # Emerald 900
        "PRIMARY_DARK": "#059669",
        "PRIMARY_ACCENT": "#34D399",
        "SECONDARY": "#38BDF8",        # Sky 400
        "SECONDARY_LIGHT": "#0C4A6E",
        "SECONDARY_DARK": "#0284C7",
        "EMERGENCY": "#FB7185",        # Rose 400
        "EMERGENCY_LIGHT": "#4C0519",
        "DUTY_GOLD": "#FBBF24",        # Amber 400
        "DUTY_LIGHT": "#451A03",
        "TEXT_PRIMARY": "#F8FAFC",     # Slate 50
        "TEXT_SECONDARY": "#94A3B8",   # Slate 400
        "TEXT_MUTED": "#64748B",       # Slate 500
        "AIRTEL_RED": "#FF1A2A",
        "AIRTEL_BG": "#450A0A",
        "MOOV_BLUE": "#38BDF8",
        "MOOV_GOLD": "#FBBF24",
        "MOOV_BG": "#0C2A4A",
        "SUCCESS": "#34D399",
        "SUCCESS_BG": "#064E3B",
        "WARNING": "#FBBF24",
        "WARNING_BG": "#451A03",
        "INFO": "#38BDF8",
        "INFO_BG": "#0C4A6E",
    }

    # Active colors initialized to light palette
    BACKGROUND = LIGHT_PALETTE["BACKGROUND"]
    CARD_BG = LIGHT_PALETTE["CARD_BG"]
    CARD_BG_HOVER = LIGHT_PALETTE["CARD_BG_HOVER"]
    SURFACE_VARIANT = LIGHT_PALETTE["SURFACE_VARIANT"]
    BORDER = LIGHT_PALETTE["BORDER"]
    BORDER_SUBTLE = LIGHT_PALETTE["BORDER_SUBTLE"]
    PRIMARY = LIGHT_PALETTE["PRIMARY"]
    PRIMARY_LIGHT = LIGHT_PALETTE["PRIMARY_LIGHT"]
    PRIMARY_DARK = LIGHT_PALETTE["PRIMARY_DARK"]
    PRIMARY_ACCENT = LIGHT_PALETTE["PRIMARY_ACCENT"]
    SECONDARY = LIGHT_PALETTE["SECONDARY"]
    SECONDARY_LIGHT = LIGHT_PALETTE["SECONDARY_LIGHT"]
    SECONDARY_DARK = LIGHT_PALETTE["SECONDARY_DARK"]
    EMERGENCY = LIGHT_PALETTE["EMERGENCY"]
    EMERGENCY_LIGHT = LIGHT_PALETTE["EMERGENCY_LIGHT"]
    DUTY_GOLD = LIGHT_PALETTE["DUTY_GOLD"]
    DUTY_LIGHT = LIGHT_PALETTE["DUTY_LIGHT"]
    TEXT_PRIMARY = LIGHT_PALETTE["TEXT_PRIMARY"]
    TEXT_SECONDARY = LIGHT_PALETTE["TEXT_SECONDARY"]
    TEXT_MUTED = LIGHT_PALETTE["TEXT_MUTED"]
    AIRTEL_RED = LIGHT_PALETTE["AIRTEL_RED"]
    AIRTEL_BG = LIGHT_PALETTE["AIRTEL_BG"]
    MOOV_BLUE = LIGHT_PALETTE["MOOV_BLUE"]
    MOOV_GOLD = LIGHT_PALETTE["MOOV_GOLD"]
    MOOV_BG = LIGHT_PALETTE["MOOV_BG"]
    SUCCESS = LIGHT_PALETTE["SUCCESS"]
    SUCCESS_BG = LIGHT_PALETTE["SUCCESS_BG"]
    WARNING = LIGHT_PALETTE["WARNING"]
    WARNING_BG = LIGHT_PALETTE["WARNING_BG"]
    INFO = LIGHT_PALETTE["INFO"]
    INFO_BG = LIGHT_PALETTE["INFO_BG"]

    @classmethod
    def set_theme(cls, is_dark: bool):
        cls.IS_DARK = is_dark
        palette = cls.DARK_PALETTE if is_dark else cls.LIGHT_PALETTE
        for key, val in palette.items():
            setattr(cls, key, val)


class MedicalStyles:
    """Modern, clean shadow system matching Tailwind CSS (shadow-sm, shadow-md)."""

    SHADOW_SM = [
        ft.BoxShadow(
            spread_radius=0,
            blur_radius=3,
            color="rgba(15, 23, 42, 0.05)",
            offset=ft.Offset(0, 1),
        )
    ]

    SHADOW_MD = [
        ft.BoxShadow(
            spread_radius=0,
            blur_radius=10,
            color="rgba(15, 23, 42, 0.08)",
            offset=ft.Offset(0, 4),
        )
    ]

    SHADOW_LG = [
        ft.BoxShadow(
            spread_radius=0,
            blur_radius=20,
            color="rgba(15, 23, 42, 0.12)",
            offset=ft.Offset(0, 8),
        )
    ]

    SHADOW_PRIMARY = [
        ft.BoxShadow(
            spread_radius=0,
            blur_radius=12,
            color="rgba(5, 150, 105, 0.20)",
            offset=ft.Offset(0, 4),
        )
    ]

    SHADOW_CYAN = [
        ft.BoxShadow(
            spread_radius=0,
            blur_radius=12,
            color="rgba(37, 99, 235, 0.20)",
            offset=ft.Offset(0, 4),
        )
    ]

    SHADOW_EMERGENCY = [
        ft.BoxShadow(
            spread_radius=0,
            blur_radius=14,
            color="rgba(225, 29, 72, 0.25)",
            offset=ft.Offset(0, 4),
        )
    ]

    SHADOW_AMBER = [
        ft.BoxShadow(
            spread_radius=0,
            blur_radius=12,
            color="rgba(217, 119, 6, 0.20)",
            offset=ft.Offset(0, 4),
        )
    ]
