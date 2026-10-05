import uuid
from datetime import date, datetime, timezone

from app.config import local_today

from .conftest import login


def _route(client, admin, n=3, optimize=True):
    pts = client.get("/points", headers=admin).json()[:n]
    drivers = client.get("/users?role=driver", headers=admin).json()
    truck = client.get("/trucks", headers=admin).json()[0]
    r = client.post(
        "/routes",
        headers=admin,
        json={
            "date": local_today().isoformat(),
            "truck_id": truck["id"],
            "driver_id": drivers[0]["id"],
            "point_ids": [p["id"] for p in pts],
            "optimize": optimize,
            "origin": {"lat": -33.45, "lng": -70.66},
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_auth_and_roles(client, admin, driver):
    assert client.get("/clients").status_code == 401
    assert client.get("/clients", headers=driver).status_code == 403
    assert client.get("/clients", headers=admin).status_code == 200
    assert client.post("/auth/login", json={"email": "admin@demo.cl", "password": "x"}).status_code == 401


def test_clients_points_crud(client, admin):
    c = client.post("/clients", headers=admin, json={"name": "Nuevo", "kind": "company"}).json()
    p = client.post(
        "/points", headers=admin, json={"client_id": c["id"], "name": "P1", "lat": -33.4, "lng": -70.6}
    )
    assert p.status_code == 201
    assert p.json()["client_name"] == "Nuevo"
    bad = client.post("/points", headers=admin, json={"client_id": c["id"], "name": "x", "lat": 99, "lng": 0})
    assert bad.status_code == 422
    assert client.delete(f"/points/{p.json()['id']}", headers=admin).status_code == 204


def test_route_creation_and_optimization(client, admin):
    route = _route(client, admin, n=5)
    assert route["optimizer"] == "local"
    assert [s["sequence"] for s in route["stops"]] == [1, 2, 3, 4, 5]
    assert route["status"] == "planned"


def test_driver_flow_and_idempotent_weighing(client, admin, driver):
    route = _route(client, admin, n=2)
    mine = client.get("/routes/mine", headers=driver).json()
    assert [r["id"] for r in mine] == [route["id"]]
    stop = mine[0]["stops"][0]
    payload = {
        "id": str(uuid.uuid4()),
        "stop_id": stop["id"],
        "kg": 42.5,
        "weighed_at": datetime.now(timezone.utc).isoformat(),
    }
    assert client.post("/weighings", headers=driver, json=payload).status_code == 201
    assert client.post("/weighings", headers=driver, json=payload).status_code == 201  # retry, no duplicate
    r = client.get(f"/routes/{route['id']}", headers=driver).json()
    assert r["total_kg"] == 42.5
    assert r["status"] == "in_progress"
    assert r["visited_stops"] == 1

    second = r["stops"][1]
    res = client.post(f"/routes/{route['id']}/stops/{second['id']}/skip", headers=driver).json()
    assert res["status"] == "completed"


def test_batch_sync_reports_per_item(client, admin, driver):
    route = _route(client, admin, n=2)
    stop = route["stops"][0]
    ok = {"id": str(uuid.uuid4()), "stop_id": stop["id"], "kg": 10, "weighed_at": datetime.now(timezone.utc).isoformat()}
    bad = {"id": str(uuid.uuid4()), "stop_id": 99999, "kg": 5, "weighed_at": datetime.now(timezone.utc).isoformat()}
    res = client.post("/weighings/batch", headers=driver, json={"items": [ok, bad, ok]}).json()
    assert [x["ok"] for x in res] == [True, False, True]
    assert res[2]["duplicate"] is True


def test_other_driver_cannot_weigh(client, admin):
    route = _route(client, admin, n=1)
    other = login(client, "chofer2@demo.cl", "chofer123")
    p = {"id": str(uuid.uuid4()), "stop_id": route["stops"][0]["id"], "kg": 1, "weighed_at": datetime.now(timezone.utc).isoformat()}
    assert client.post("/weighings", headers=other, json=p).status_code == 404


def test_dashboard_and_csv(client, admin, driver):
    route = _route(client, admin, n=2)
    stop = route["stops"][0]
    client.post(
        "/weighings",
        headers=driver,
        json={"id": str(uuid.uuid4()), "stop_id": stop["id"], "kg": 7.25, "notes": "=cmd", "weighed_at": datetime.now(timezone.utc).isoformat()},
    )
    d = client.get("/dashboard", headers=admin).json()
    assert d["total_kg"] == 7.25 and d["visited_stops"] == 1 and d["pending_stops"] == 1
    today = local_today().isoformat()
    csv = client.get(f"/reports/traceability.csv?from={today}&to={today}", headers=admin)
    assert csv.status_code == 200
    assert "7.25" in csv.text and "'=cmd" in csv.text
