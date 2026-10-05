from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Client, CollectionPoint, Role, Truck, User
from .security import hash_password

CLIENTS = [
    ("Condominio Parque Araucano", "condominium", [("Torre A", "Av. Presidente Riesco 5330, Las Condes", -33.4072, -70.5783), ("Torre B", "Av. Presidente Riesco 5350, Las Condes", -33.4068, -70.5771)]),
    ("Condominio Los Alerces", "condominium", [("Acceso principal", "Av. Vitacura 3900, Vitacura", -33.4009, -70.5918)]),
    ("Oficinas Titanium", "company", [("Subterráneo -2", "Av. Américo Vespucio Sur 100, Las Condes", -33.4125, -70.5831)]),
    ("Supermercado Central", "company", [("Bodega trasera", "Av. Providencia 2300, Providencia", -33.4249, -70.6104)]),
    ("Edificio Plaza Ñuñoa", "condominium", [("Bajada estacionamientos", "Av. Irarrázaval 2800, Ñuñoa", -33.4546, -70.6021)]),
    ("Colegio San Pedro", "company", [("Patio de servicio", "Av. Grecia 1500, Ñuñoa", -33.4637, -70.5944)]),
    ("Mall Plaza Vespucio", "company", [("Andén de carga", "Av. Vicuña Mackenna 7110, La Florida", -33.5171, -70.5994)]),
    ("Condominio Vista Cordillera", "condominium", [("Sala de basura", "Av. Las Condes 12000, Lo Barnechea", -33.3612, -70.5105)]),
    ("Clínica Santa María", "company", [("Residuos reciclables", "Av. Santa María 0500, Providencia", -33.4300, -70.6330)]),
    ("Edificio Mirador Santiago", "condominium", [("Subterráneo -1", "Av. Libertador B. O'Higgins 1100, Santiago", -33.4450, -70.6500)]),
]


def seed_demo(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)):
        return
    db.add_all([
        User(email="admin@demo.cl", name="Admin Demo", password_hash=hash_password("admin123"), role=Role.admin),
        User(email="chofer@demo.cl", name="Carlos Chofer", password_hash=hash_password("chofer123"), role=Role.driver),
        User(email="chofer2@demo.cl", name="Marta Conductora", password_hash=hash_password("chofer123"), role=Role.driver),
        Truck(plate="ABCD-12", name="Camión 1", capacity_kg=2000),
        Truck(plate="WXYZ-34", name="Camión 2", capacity_kg=1500),
    ])
    for name, kind, points in CLIENTS:
        client = Client(name=name, kind=kind)
        client.points = [CollectionPoint(name=n, address=a, lat=lat, lng=lng) for n, a, lat, lng in points]
        db.add(client)
    db.commit()
