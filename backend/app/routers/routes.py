from datetime import date as date_type
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..config import local_today
from ..db import get_db
from ..deps import current_user, require_admin, require_driver
from ..models import CollectionPoint, Role, Route, RouteStatus, RouteStop, StopStatus, Truck, User, Weighing
from ..schemas import OptimizeIn, OptimizeOut, RouteCreate, RouteOut
from ..services import routing
from ..services.routes import load_stop, refresh_status, route_out, routes_out, stop_kg_map
from .points import point_out

router = APIRouter(prefix="/routes", tags=["routes"])

_route_loaders = (
    selectinload(Route.stops).joinedload(RouteStop.point).joinedload(CollectionPoint.client),
    joinedload(Route.truck),
    joinedload(Route.driver),
)


def _load_points(db: Session, point_ids: list[int]) -> list[CollectionPoint]:
    if len(set(point_ids)) != len(point_ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Duplicate point_ids")
    points = {
        p.id: p
        for p in db.scalars(
            select(CollectionPoint)
            .options(joinedload(CollectionPoint.client))
            .where(CollectionPoint.id.in_(point_ids), CollectionPoint.active.is_(True))
        )
    }
    missing = [i for i in point_ids if i not in points]
    if missing:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown or inactive points: {missing}")
    return [points[i] for i in point_ids]


def _order(points: list[CollectionPoint], origin) -> tuple[str, list[CollectionPoint]]:
    by_id = {p.id: p for p in points}
    wps = [routing.Waypoint(p.id, p.lat, p.lng) for p in points]
    org = routing.Waypoint(0, origin.lat, origin.lng) if origin else None
    name, ids = routing.optimize(wps, org)
    return name, [by_id[i] for i in ids]


@router.post("/optimize", response_model=OptimizeOut, dependencies=[Depends(require_admin)])
def optimize(data: OptimizeIn, db: Session = Depends(get_db)):
    points = _load_points(db, data.point_ids)
    name, ordered = _order(points, data.origin)
    return OptimizeOut(
        optimizer=name, ordered_point_ids=[p.id for p in ordered], points=[point_out(p) for p in ordered]
    )


@router.post("", response_model=RouteOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_route(data: RouteCreate, db: Session = Depends(get_db)):
    if data.truck_id and not db.get(Truck, data.truck_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown truck_id")
    if data.driver_id:
        driver = db.get(User, data.driver_id)
        if not driver or driver.role != Role.driver:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "driver_id must be a driver user")
    points = _load_points(db, data.point_ids)
    optimizer = "none"
    if data.optimize:
        optimizer, points = _order(points, data.origin)
    route = Route(
        date=data.date,
        truck_id=data.truck_id,
        driver_id=data.driver_id,
        optimizer=optimizer,
        origin_lat=data.origin.lat if data.origin else None,
        origin_lng=data.origin.lng if data.origin else None,
        stops=[RouteStop(point_id=p.id, sequence=i + 1) for i, p in enumerate(points)],
    )
    db.add(route)
    db.commit()
    return _get_route_out(db, route.id)


def _get_route_out(db: Session, route_id: int) -> RouteOut:
    route = db.scalar(select(Route).options(*_route_loaders).where(Route.id == route_id))
    if not route:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found")
    return route_out(route, stop_kg_map(db, [route.id]))


@router.get("", response_model=list[RouteOut], dependencies=[Depends(require_admin)])
def list_routes(date: date_type | None = None, db: Session = Depends(get_db)):
    q = select(Route).options(*_route_loaders).order_by(Route.date.desc(), Route.id.desc())
    if date:
        q = q.where(Route.date == date)
    return routes_out(db, list(db.scalars(q)))


@router.get("/mine", response_model=list[RouteOut])
def my_routes(date: date_type | None = None, user: User = Depends(require_driver), db: Session = Depends(get_db)):
    day = date or local_today()
    q = (
        select(Route)
        .options(*_route_loaders)
        .where(Route.driver_id == user.id, Route.date == day)
        .order_by(Route.id)
    )
    return routes_out(db, list(db.scalars(q)))


@router.get("/{route_id}", response_model=RouteOut)
def get_route(route_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    out = _get_route_out(db, route_id)
    if user.role == Role.driver and out.driver_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your route")
    return out


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_route(route_id: int, db: Session = Depends(get_db)):
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found")
    if db.scalar(select(Weighing.id).where(Weighing.route_id == route_id).limit(1)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Route has weighings and cannot be deleted")
    db.delete(route)
    db.commit()


@router.post("/{route_id}/stops/{stop_id}/skip", response_model=RouteOut)
def skip_stop(route_id: int, stop_id: int, user: User = Depends(require_driver), db: Session = Depends(get_db)):
    route = db.get(Route, route_id)
    if not route or route.driver_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found")
    stop = load_stop(db, route_id, stop_id)
    if not stop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stop not found")
    if stop.status == StopStatus.visited:
        raise HTTPException(status.HTTP_409_CONFLICT, "Stop already visited")
    stop.status = StopStatus.skipped
    stop.visited_at = datetime.now(timezone.utc)
    db.flush()
    db.refresh(route)
    refresh_status(route)
    db.commit()
    return _get_route_out(db, route_id)
