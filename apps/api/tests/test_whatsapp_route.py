from fastapi.testclient import TestClient

from app.main import app
from app.models.task import ExtractedTask

client = TestClient(app)


def test_whatsapp_text_returns_twiml(monkeypatch):
    async def fake_normalize(form, settings):
        assert form["Body"] == "Yo hago el informe"
        return "Yo hago el informe"

    async def fake_extract(message_text, sender, settings):
        assert message_text == "Yo hago el informe"
        assert sender == "Mateo"
        return ExtractedTask(
            intent="task_creation",
            owner="Mateo",
            task_title="Hacer informe",
            description=None,
            due_date=None,
            status="pending",
            priority="normal",
            confidence=0.9,
        )

    monkeypatch.setattr("app.routers.whatsapp.normalize_twilio_message", fake_normalize)
    monkeypatch.setattr("app.routers.whatsapp.extract_task", fake_extract)

    response = client.post(
        "/whatsapp",
        data={"Body": "Yo hago el informe", "ProfileName": "Mateo"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/xml")
    assert "<Response><Message>Registre: Hacer informe. Confirmas?</Message></Response>" in response.text


def test_whatsapp_audio_returns_twiml_after_transcription(monkeypatch):
    async def fake_normalize(form, settings):
        assert form["NumMedia"] == "1"
        assert form["MediaContentType0"] == "audio/ogg"
        return "Transcripcion del audio"

    async def fake_extract(message_text, sender, settings):
        assert message_text == "Transcripcion del audio"
        return ExtractedTask(
            intent="task_creation",
            owner="Laura",
            task_title="Coordinar taller",
            description=None,
            due_date="2026-06-12",
            status="pending",
            priority="normal",
            confidence=0.87,
        )

    monkeypatch.setattr("app.routers.whatsapp.normalize_twilio_message", fake_normalize)
    monkeypatch.setattr("app.routers.whatsapp.extract_task", fake_extract)

    response = client.post(
        "/whatsapp",
        data={
            "NumMedia": "1",
            "MediaUrl0": "https://api.twilio.com/media",
            "MediaContentType0": "audio/ogg",
            "ProfileName": "Laura",
        },
    )

    assert response.status_code == 200
    assert "Registre: Coordinar taller - 2026-06-12. Confirmas?" in response.text


def test_whatsapp_audio_failure_returns_clarification(monkeypatch):
    async def fake_normalize(form, settings):
        raise RuntimeError("download failed")

    monkeypatch.setattr("app.routers.whatsapp.normalize_twilio_message", fake_normalize)

    response = client.post(
        "/whatsapp",
        data={
            "NumMedia": "1",
            "MediaUrl0": "https://api.twilio.com/media",
            "MediaContentType0": "audio/ogg",
        },
    )

    assert response.status_code == 200
    assert "No entendi bien" in response.text
