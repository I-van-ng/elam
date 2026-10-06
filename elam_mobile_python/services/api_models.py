"""Adaptateur entre les reponses JSON de l'API et le code des vues.

L'API renvoie du camelCase (firstName, consultationFee, hasEmergency247), alors
que les vues et les modales ont ete ecrites contre les modeles SQLAlchemy locaux,
en snake_case (first_name, consultation_fee, has_emergency_247).

Plutot que de reecrire les 10 vues (~6 000 lignes), on expose les donnees de
l'API sous la meme forme que les modeles locaux. Les vues continuent donc de
fonctionner a l'identique, seule la SOURCE des donnees change : l'API au lieu
de SQLite.
"""
import re

_CAMEL_BOUNDARY = re.compile(r"(?<!^)(?=[A-Z])")

# Attributs dont le nom differe entre l'API et les modeles locaux.
# Cle = nom snake_case produit a partir de l'API ; valeur = alias a exposer aussi.
ALIASES = {
    "emergency_phone247": ("emergency_phone",),   # clinique : API -> modele local
    "has_emergency247": ("has_emergency_247",),
    "services": ("services_list",),
}


def to_snake(name: str) -> str:
    """firstName -> first_name, hasEmergency247 -> has_emergency247."""
    return _CAMEL_BOUNDARY.sub("_", name).lower()


def _wrap(value):
    if isinstance(value, dict):
        return ApiObject(value)
    if isinstance(value, list):
        return [_wrap(item) for item in value]
    return value


class ApiObject:
    """Objet leger exposant les donnees de l'API comme les modeles locaux."""

    def __init__(self, data: dict, aliases: dict = None):
        object.__setattr__(self, "_raw", data or {})
        # Vue snake_case des donnees brutes : les alias sont declarés en snake_case
        # alors que l'API renvoie du camelCase.
        snake_view = {to_snake(key): value for key, value in (data or {}).items()}
        for key, value in snake_view.items():
            object.__setattr__(self, key, _wrap(value))
        for source, targets in (aliases or {}).items():
            if source in snake_view:
                for target in targets:
                    object.__setattr__(self, target, _wrap(snake_view[source]))

    def get(self, key, default=None):
        return getattr(self, key, default)

    def __repr__(self):
        label = getattr(self, "name", None) or getattr(self, "id", "?")
        return f"<ApiObject {label}>"


def api_object(data: dict):
    """Convertit un objet JSON de l'API en objet type modele local."""
    if data is None:
        return None
    return ApiObject(data, ALIASES)


def api_list(items) -> list:
    """Convertit une liste JSON de l'API en liste d'objets type modele local."""
    return [ApiObject(item, ALIASES) for item in (items or []) if isinstance(item, dict)]


def stock_offer_object(offer: dict, medication_id: str = None):
    """Pont pour les offres de /pharmacies/medications/search.

    L'API renvoie des offres *plates* (pharmacyName, stockStatus, priceFcfa...),
    alors que les vues attendent un objet avec une pharmacie imbriquee et un
    champ `status`. On reconstruit les deux.
    """
    data = dict(offer or {})
    if medication_id and not data.get("medicationId"):
        data["medicationId"] = medication_id

    obj = ApiObject(data, ALIASES)
    # stockStatus -> status (nom attendu par les vues)
    object.__setattr__(obj, "status", getattr(obj, "stock_status", None))
    # Objet pharmacie reconstitue a partir des champs plats
    object.__setattr__(
        obj,
        "pharmacy",
        ApiObject(
            {
                "id": data.get("pharmacyId"),
                "name": data.get("pharmacyName"),
                "address": data.get("address"),
                "district": data.get("district"),
                "city": data.get("city"),
                "phone": data.get("phone"),
                "isOnDuty": data.get("isOnDuty"),
                "acceptsCnamgs": data.get("acceptsCnamgs"),
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
            },
            ALIASES,
        ),
    )
    return obj


def stock_offers_from_api(offers, medication_id: str = None) -> list:
    """Convertit la liste `offers` d'une reponse de disponibilite."""
    return [stock_offer_object(o, medication_id) for o in (offers or []) if isinstance(o, dict)]



def parse_services(raw):
    """Le champ 'services' d'une clinique est une chaine JSON cote backend."""
    import json

    if not raw:
        return []
    if isinstance(raw, (list, tuple)):
        return list(raw)
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return [part.strip() for part in str(raw).split(",") if part.strip()]
