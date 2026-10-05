from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_driver
from ..models import Route, RouteStop, StopStatus, User, Weighing
from ..schemas import WeighingBatchIn, WeighingBatchResult, WeighingIn, WeighingOut
from ..services.routes import refresh_status

router = APIRouter(prefix="/weighings", tags=["weighings"])


class WeighingError(Exception):
    def __init__(self, code: int, message: str):
        self.code, self.message = code, message


def _register(db: Session, user: User, data: WeighingIn) -> tuple[Weighing, bool]:
    """Idempotent by client UUID. Returns (weighing, duplicate)."""
    existing = db.get(Weighing, data.id)
    if existing:
        if existing.driver_id != user.id:
            raise WeighingError(status.HTTP_409_CONFLICT, "Weighing id belongs to another driver")
        return existing, True
    stop = db.get(RouteStop, data.stop_id)
    route = db.get(Route, stop.route_id) if stop else None
    if not stop or not route or route.driver_id != user.id:
        raise WeighingError(status.HTTP_404_NOT_FOUND, "Stop not found")
    w = Weighing(
        id=data.id,
        stop_id=stop.id,
        route_id=route.id,
        point_id=stop.point_id,
        driver_id=user.id,
        kg=data.kg,
        material=data.material,
        notes=data.notes,
        weighed_at=data.weighed_at,
    )
    db.add(w)
    if stop.status != StopStatus.visited:
        stop.visited_at = data.weighed_at
    stop.status = StopStatus.visited
    db.flush()
    db.refresh(route)
    refresh_status(route)
    return w, False


@router.post("", response_model=WeighingOut, status_code=status.HTTP_201_CREATED)
def create_weighing(data: WeighingIn, user: User = Depends(require_driver), db: Session = Depends(get_db)):
    try:
        w, _ = _register(db, user, data)
    except WeighingError as e:
        raise HTTPException(e.code, e.message)
    db.commit()
    return w


@router.post("/batch", response_model=list[WeighingBatchResult])
def create_weighings_batch(
    batch: WeighingBatchIn, user: User = Depends(require_driver), db: Session = Depends(get_db)
):
    results: list[WeighingBatchResult] = []
    for item in batch.items:
        try:
            _, dup = _register(db, user, item)
            db.commit()
            results.append(WeighingBatchResult(id=item.id, ok=True, duplicate=dup))
        except WeighingError as e:
            db.rollback()
            results.append(WeighingBatchResult(id=item.id, ok=False, error=e.message))
    return results
