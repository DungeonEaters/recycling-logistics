"""Route ordering. Google Routes API when a key is configured, local heuristic otherwise."""
import logging
import math
from dataclasses import dataclass

import httpx

from ..config import settings

log = logging.getLogger(__name__)
MAX_STOPS = 25


@dataclass
class Waypoint:
    id: int
    lat: float
    lng: float


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    r = 6371000.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dphi = p2 - p1
    dl = math.radians(b[1] - a[1])
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _dist(a: Waypoint, b: Waypoint) -> float:
    return haversine_m((a.lat, a.lng), (b.lat, b.lng))


def _path_length(order: list[Waypoint], origin: Waypoint | None) -> float:
    seq = ([origin] if origin else []) + order
    return sum(_dist(seq[i], seq[i + 1]) for i in range(len(seq) - 1))


def optimize_local(points: list[Waypoint], origin: Waypoint | None) -> list[int]:
    """Nearest neighbour followed by 2-opt. Open path starting at origin (or first point)."""
    if len(points) <= 2 and origin is None:
        return [p.id for p in points]
    remaining = points[:]
    order: list[Waypoint] = []
    current = origin or remaining.pop(0)
    if origin is None:
        order.append(current)
    while remaining:
        nxt = min(remaining, key=lambda p: _dist(current, p))
        remaining.remove(nxt)
        order.append(nxt)
        current = nxt
    improved = True
    while improved:
        improved = False
        for i in range(len(order) - 1):
            for j in range(i + 1, len(order)):
                candidate = order[:i] + order[i : j + 1][::-1] + order[j + 1 :]
                if _path_length(candidate, origin) + 1e-6 < _path_length(order, origin):
                    order = candidate
                    improved = True
    return [p.id for p in order]


def _optimize_google(points: list[Waypoint], origin: Waypoint) -> list[int]:
    """Last point is the fixed destination (Routes API reorders intermediates only)."""
    body = {
        "origin": {"location": {"latLng": {"latitude": origin.lat, "longitude": origin.lng}}},
        "destination": {"location": {"latLng": {"latitude": points[-1].lat, "longitude": points[-1].lng}}},
        "intermediates": [
            {"location": {"latLng": {"latitude": p.lat, "longitude": p.lng}}} for p in points[:-1]
        ],
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "optimizeWaypointOrder": True,
    }
    resp = httpx.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        json=body,
        headers={
            "X-Goog-Api-Key": settings.google_maps_api_key,
            "X-Goog-FieldMask": "routes.optimizedIntermediateWaypointIndex",
        },
        timeout=15,
    )
    resp.raise_for_status()
    idx = resp.json()["routes"][0].get("optimizedIntermediateWaypointIndex", list(range(len(points) - 1)))
    return [points[i].id for i in idx] + [points[-1].id]


def optimize(points: list[Waypoint], origin: Waypoint | None) -> tuple[str, list[int]]:
    if len(points) > MAX_STOPS:
        raise ValueError(f"At most {MAX_STOPS} stops per route")
    if settings.google_maps_api_key and len(points) >= 2:
        try:
            ids = _optimize_google(points, origin) if origin else _google_without_origin(points)
            return "google", ids
        except Exception:  # noqa: BLE001 - never block dispatching on a third-party failure
            log.exception("Google Routes failed, falling back to local optimizer")
    return "local", optimize_local(points, origin)


def _google_without_origin(points: list[Waypoint]) -> list[int]:
    ids = _optimize_google(points[1:], points[0]) if len(points) > 2 else [p.id for p in points[1:]]
    return [points[0].id] + ids
