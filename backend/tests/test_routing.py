from app.services.routing import Waypoint, optimize_local, haversine_m


def test_local_optimizer_orders_line():
    pts = [Waypoint(1, 0, 0.3), Waypoint(2, 0, 0.1), Waypoint(3, 0, 0.2)]
    assert optimize_local(pts, Waypoint(0, 0, 0)) == [2, 3, 1]


def test_local_optimizer_not_worse_than_input():
    pts = [Waypoint(i, (i * 7 % 5) * 0.01, (i * 3 % 7) * 0.01) for i in range(1, 9)]
    origin = Waypoint(0, 0, 0)

    def length(ids):
        by = {p.id: p for p in pts}
        seq = [origin] + [by[i] for i in ids]
        return sum(haversine_m((a.lat, a.lng), (b.lat, b.lng)) for a, b in zip(seq, seq[1:]))

    assert length(optimize_local(pts, origin)) <= length([p.id for p in pts])
