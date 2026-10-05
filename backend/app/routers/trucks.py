from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from ..models import Truck
from ..schemas import TruckIn, TruckOut

router = APIRouter(prefix="/trucks", tags=["trucks"], dependencies=[Depends(require_admin)])


def _get(db: Session, truck_id: int) -> Truck:
    t = db.get(Truck, truck_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Truck not found")
    return t


@router.get("", response_model=list[TruckOut])
def list_trucks(db: Session = Depends(get_db)):
    return db.scalars(select(Truck).order_by(Truck.plate)).all()


@router.post("", response_model=TruckOut, status_code=status.HTTP_201_CREATED)
def create_truck(data: TruckIn, db: Session = Depends(get_db)):
    t = Truck(**data.model_dump())
    db.add(t)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Plate already registered")
    return t


@router.put("/{truck_id}", response_model=TruckOut)
def update_truck(truck_id: int, data: TruckIn, db: Session = Depends(get_db)):
    t = _get(db, truck_id)
    for k, v in data.model_dump().items():
        setattr(t, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Plate already registered")
    return t


@router.delete("/{truck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_truck(truck_id: int, db: Session = Depends(get_db)):
    _get(db, truck_id).active = False
    db.commit()
