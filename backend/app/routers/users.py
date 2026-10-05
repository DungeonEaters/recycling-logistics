from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from ..models import Role, User
from ..schemas import UserCreate, UserOut
from ..security import hash_password

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UserOut])
def list_users(role: Role | None = None, db: Session = Depends(get_db)):
    q = select(User).order_by(User.name)
    if role:
        q = q.where(User.role == role)
    return db.scalars(q).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(email=email, name=data.name, password_hash=hash_password(data.password), role=data.role)
    db.add(user)
    db.commit()
    return user
