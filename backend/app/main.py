from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401 - register tables
from .config import settings
from .db import Base, SessionLocal, engine
from .routers import auth, clients, dashboard, points, reports, routes, trucks, users, weighings
from .seed import seed_demo


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    if settings.seed_demo:
        with SessionLocal() as db:
            seed_demo(db)
    yield


app = FastAPI(title="Recycling Logistics API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_origin_regex=r"^(capacitor|ionic)://localhost$|^https?://localhost(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

for r in (auth, users, clients, points, trucks, routes, weighings, dashboard, reports):
    app.include_router(r.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
