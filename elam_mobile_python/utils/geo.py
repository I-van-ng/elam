import math


def calculate_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def format_travel_info(dist_km):
    if dist_km < 0.5:
        return f"{int(dist_km * 1000)} m • ~2 min"
    mins = max(3, int(dist_km * 2.5))
    return f"{dist_km} km • ~{mins} min"
