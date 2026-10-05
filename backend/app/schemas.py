import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import Role, RouteStatus, StopStatus


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# Auth / users
class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(ORM):
    id: int
    email: str
    name: str
    role: Role
    active: bool


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=6)
    role: Role = Role.driver


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# Clients
class ClientBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    kind: str = "company"
    tax_id: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    active: bool = True


class ClientIn(ClientBase):
    pass


class ClientOut(ClientBase, ORM):
    id: int


# Collection points
class PointBase(BaseModel):
    client_id: int
    name: str = Field(min_length=1, max_length=160)
    address: str = ""
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    notes: str | None = None
    active: bool = True


class PointIn(PointBase):
    pass


class PointOut(PointBase, ORM):
    id: int
    client_name: str | None = None


# Trucks
class TruckBase(BaseModel):
    plate: str = Field(min_length=1, max_length=20)
    name: str = ""
    capacity_kg: float | None = None
    active: bool = True


class TruckIn(TruckBase):
    pass


class TruckOut(TruckBase, ORM):
    id: int


# Routes
class LatLng(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class OptimizeIn(BaseModel):
    point_ids: list[int] = Field(min_length=1, max_length=25)
    origin: LatLng | None = None


class OptimizeOut(BaseModel):
    optimizer: str
    ordered_point_ids: list[int]
    points: list[PointOut]


class RouteCreate(BaseModel):
    date: date
    truck_id: int | None = None
    driver_id: int | None = None
    point_ids: list[int] = Field(min_length=1, max_length=25)
    origin: LatLng | None = None
    optimize: bool = True


class StopOut(ORM):
    id: int
    point_id: int
    sequence: int
    status: StopStatus
    visited_at: datetime | None
    point_name: str
    client_name: str
    address: str
    lat: float
    lng: float
    kg: float | None = None


class RouteOut(ORM):
    id: int
    date: date
    status: RouteStatus
    optimizer: str
    truck_id: int | None
    truck_label: str | None = None
    driver_id: int | None
    driver_name: str | None = None
    origin: LatLng | None = None
    total_stops: int
    visited_stops: int
    total_kg: float
    stops: list[StopOut] = []


class RouteSummary(RouteOut):
    stops: list[StopOut] = []


# Weighings
class WeighingIn(BaseModel):
    id: uuid.UUID
    stop_id: int
    kg: float = Field(gt=0, le=100000)
    material: str = "plastico"
    notes: str | None = None
    weighed_at: datetime


class WeighingOut(ORM):
    id: uuid.UUID
    stop_id: int
    route_id: int
    point_id: int
    kg: float
    material: str
    notes: str | None
    weighed_at: datetime
    received_at: datetime


class WeighingBatchIn(BaseModel):
    items: list[WeighingIn] = Field(max_length=200)


class WeighingBatchResult(BaseModel):
    id: uuid.UUID
    ok: bool
    duplicate: bool = False
    error: str | None = None


# Dashboard
class TruckProgress(BaseModel):
    route_id: int
    truck_label: str | None
    driver_name: str | None
    status: RouteStatus
    total_stops: int
    visited_stops: int
    kg: float


class DashboardOut(BaseModel):
    date: date
    routes: int
    total_stops: int
    visited_stops: int
    pending_stops: int
    total_kg: float
    by_route: list[TruckProgress]
