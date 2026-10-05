import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["SEED_DEMO"] = "true"
os.environ["GOOGLE_MAPS_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool

from app import db as dbmod


@pytest.fixture()
def client():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(
        "sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    dbmod.engine = engine
    dbmod.SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    import app.main as main

    main.engine = engine
    main.SessionLocal = dbmod.SessionLocal
    main.app.dependency_overrides[dbmod.get_db] = _override(dbmod.SessionLocal)
    with TestClient(main.app) as c:
        yield c
    main.app.dependency_overrides.clear()


def _override(factory):
    def get_db():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    return get_db


def login(c: TestClient, email: str, password: str) -> dict:
    r = c.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin(client):
    return login(client, "admin@demo.cl", "admin123")


@pytest.fixture()
def driver(client):
    return login(client, "chofer@demo.cl", "chofer123")
