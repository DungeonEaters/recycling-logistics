from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Route, RouteStatus, RouteStop, StopStatus, Weighing
from ..schemas import LatLng, RouteOut, StopOut


def stop_kg_map(db: Session, route_ids: list[int]) -> dict[int, float]:
    if not route_ids:
        return {}
    rows = db.execute(
        select(Weighing.stop_id, func.sum(Weighing.kg))
        .where(Weighing.route_id.in_(route_ids))
        .group_by(Weighing.stop_id)
    ).all()
    return {stop_id: float(kg) for stop_id, kg in rows}


def route_out(route: Route, kg_by_stop: dict[int, float]) -> RouteOut:
    stops = [
        StopOut(
            id=s.id,
            point_id=s.point_id,
            sequence=s.sequence,
            status=s.status,
            visited_at=s.visited_at,
            point_name=s.point.name,
            client_name=s.point.client.name,
            address=s.point.address,
            lat=s.point.lat,
            lng=s.point.lng,
            kg=kg_by_stop.get(s.id),
        )
        for s in route.stops
    ]
    return RouteOut(
        id=route.id,
        date=route.date,
        status=route.status,
        optimizer=route.optimizer,
        truck_id=route.truck_id,
        truck_label=(f"{route.truck.plate} {route.truck.name}".strip() if route.truck else None),
        driver_id=route.driver_id,
        driver_name=route.driver.name if route.driver else None,
        origin=LatLng(lat=route.origin_lat, lng=route.origin_lng) if route.origin_lat is not None else None,
        total_stops=len(stops),
        visited_stops=sum(1 for s in stops if s.status != StopStatus.pending),
        total_kg=sum(s.kg or 0 for s in stops),
        stops=stops,
    )


def routes_out(db: Session, routes: list[Route]) -> list[RouteOut]:
    kg = stop_kg_map(db, [r.id for r in routes])
    return [route_out(r, kg) for r in routes]


def refresh_status(route: Route) -> None:
    done = [s for s in route.stops if s.status != StopStatus.pending]
    if route.stops and len(done) == len(route.stops):
        route.status = RouteStatus.completed
    elif done:
        route.status = RouteStatus.in_progress
    else:
        route.status = RouteStatus.planned


def load_stop(db: Session, route_id: int, stop_id: int) -> RouteStop | None:
    stop = db.get(RouteStop, stop_id)
    return stop if stop and stop.route_id == route_id else None
