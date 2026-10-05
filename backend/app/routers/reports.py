import csv
import io
from datetime import date as date_type
from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..config import local_tz
from ..db import get_db
from ..deps import require_admin
from ..models import CollectionPoint, Weighing

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_admin)])

HEADER = [
    "weighing_id", "weighed_at", "date", "client", "point", "address", "lat", "lng",
    "material", "kg", "driver", "truck", "route_id", "notes",
]


def _local(dt: datetime, tz) -> datetime:
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).astimezone(tz)


def _safe(value):
    """Neutralise spreadsheet formula injection from free-text fields."""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@"):
        return "'" + value
    return value


@router.get("/traceability.csv")
def traceability_csv(
    date_from: date_type = Query(alias="from"),
    date_to: date_type = Query(alias="to"),
    client_id: int | None = None,
    db: Session = Depends(get_db),
):
    tz = local_tz()
    start = datetime.combine(date_from, time.min, tzinfo=tz).astimezone(timezone.utc)
    end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=tz).astimezone(timezone.utc)
    q = (
        select(Weighing)
        .options(
            joinedload(Weighing.point).joinedload(CollectionPoint.client),
            joinedload(Weighing.driver),
            joinedload(Weighing.route),
        )
        .where(Weighing.weighed_at >= start, Weighing.weighed_at < end)
        .order_by(Weighing.weighed_at)
    )
    if client_id:
        q = q.join(CollectionPoint, Weighing.point_id == CollectionPoint.id).where(
            CollectionPoint.client_id == client_id
        )
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(HEADER)
    for x in db.scalars(q).unique():
        truck = x.route.truck
        w.writerow([_safe(v) for v in [
            str(x.id), _local(x.weighed_at, tz).isoformat(timespec="seconds"), x.route.date.isoformat(), x.point.client.name, x.point.name,
            x.point.address, x.point.lat, x.point.lng, x.material, f"{x.kg:.2f}", x.driver.name,
            truck.plate if truck else "", x.route_id, x.notes or "",
        ]])
    return StreamingResponse(
        iter(["\ufeff" + buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="trazabilidad_{date_from}_{date_to}.csv"'},
    )
