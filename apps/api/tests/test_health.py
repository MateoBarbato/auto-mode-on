"""Smoke test: the app boots and routers wire up."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_routers_mounted():
    # Stub routers are mounted and reachable (not 404).
    for path in ("/whatsapp", "/reminders/run", "/meetings"):
        assert client.post(path).status_code != 404
