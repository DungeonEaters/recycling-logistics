from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..config import local_today
from ..db import get_db
from ..deps import require_admin
from ..models import CollectionPoint, Route, RouteStop, StopStatus
from ..schemas import DashboardOut, TruckProgress
from ..services.routes import route_out, stop_kg_map

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_admin)])


@router.get("", response_model=DashboardOut)
def dashboard(date: date_type | None = None, db: Session = Depends(get_db)):
    day = date or local_today()
    routes = list(
        db.scalars(
            select(Route)
            .options(
                selectinload(Route.stops).joinedload(RouteStop.point).joinedload(CollectionPoint.client),
                joinedload(Route.truck),
                joinedload(Route.driver),
            )
            .where(Route.date == day)
            .order_by(Route.id)
        )
    )
    kg = stop_kg_map(db, [r.id for r in routes])
    outs = [route_out(r, kg) for r in routes]
    total = sum(o.total_stops for o in outs)
    visited = sum(o.visited_stops for o in outs)
    return DashboardOut(
        date=day,
        routes=len(outs),
        total_stops=total,
        visited_stops=visited,
        pending_stops=total - visited,
        total_kg=sum(o.total_kg for o in outs),
        by_route=[
            TruckProgress(
                route_id=o.id,
                truck_label=o.truck_label,
                driver_name=o.driver_name,
                status=o.status,
                total_stops=o.total_stops,
                visited_stops=o.visited_stops,
                kg=o.total_kg,
            )
            for o in outs
        ],
    )
