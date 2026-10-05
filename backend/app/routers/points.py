from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..deps import require_admin
from ..models import Client, CollectionPoint
from ..schemas import PointIn, PointOut

router = APIRouter(prefix="/points", tags=["points"], dependencies=[Depends(require_admin)])


def point_out(p: CollectionPoint) -> PointOut:
    out = PointOut.model_validate(p)
    out.client_name = p.client.name if p.client else None
    return out


def _get(db: Session, point_id: int) -> CollectionPoint:
    p = db.get(CollectionPoint, point_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Point not found")
    return p


def _check_client(db: Session, client_id: int) -> None:
    if not db.get(Client, client_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown client_id")


@router.get("", response_model=list[PointOut])
def list_points(client_id: int | None = None, active_only: bool = False, db: Session = Depends(get_db)):
    q = select(CollectionPoint).options(joinedload(CollectionPoint.client)).order_by(CollectionPoint.name)
    if client_id:
        q = q.where(CollectionPoint.client_id == client_id)
    if active_only:
        q = q.where(CollectionPoint.active.is_(True))
    return [point_out(p) for p in db.scalars(q).all()]


@router.post("", response_model=PointOut, status_code=status.HTTP_201_CREATED)
def create_point(data: PointIn, db: Session = Depends(get_db)):
    _check_client(db, data.client_id)
    p = CollectionPoint(**data.model_dump())
    db.add(p)
    db.commit()
    return point_out(p)


@router.put("/{point_id}", response_model=PointOut)
def update_point(point_id: int, data: PointIn, db: Session = Depends(get_db)):
    p = _get(db, point_id)
    _check_client(db, data.client_id)
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    return point_out(p)


@router.delete("/{point_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_point(point_id: int, db: Session = Depends(get_db)):
    _get(db, point_id).active = False
    db.commit()
