from fastapi.testclient import TestClient

from app.main import app
from app.models.task import ExtractedTask
from app.services.capture import Channel, Sender

client = TestClient(app)


def setup_registered_sender(monkeypatch):
    saved = {}

    monkeypatch.setattr("app.routers.whatsapp.get_db", lambda: object())
    monkeypatch.setattr(
        "app.routers.whatsapp.resolve_channel",
        lambda db, to_number: Channel(id="channel-1", organization_id="org-1"),
    )
    monkeypatch.setattr(
        "app.routers.whatsapp.resolve_sender",
        lambda db, organization_id, from_number: Sender(id="person-1", display_name="Mateo"),
    )
    monkeypatch.setattr("app.routers.whatsapp.get_existing_inbound", lambda db, organization_id, sid: None)

    def fake_save_inbound(db, organization_id, form, normalized_text, sender_name):
        saved["inbound"] = {
            "id": "inbound-1",
            "organization_id": organization_id,
            "body": normalized_text,
            "sender_name": sender_name,
        }
        return saved["inbound"]

    def fake_save_task(db, organization_id, inbound, sender, task):
        saved["task"] = {
            "id": "task-1",
            "organization_id": organization_id,
            "source_message_id": inbound["id"],
            "owner_id": sender.id,
            "task_title": task.task_title,
        }
        return saved["task"]

    monkeypatch.setattr("app.routers.whatsapp.save_inbound_message", fake_save_inbound)
    monkeypatch.setattr("app.routers.whatsapp.save_task", fake_save_task)
    monkeypatch.setattr("app.routers.whatsapp.get_task_for_inbound", lambda db, organization_id, inbound_id: None)

    return saved


def test_whatsapp_text_returns_twiml(monkeypatch):
    saved = setup_registered_sender(monkeypatch)

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
        data={
            "Body": "Yo hago el informe",
            "To": "whatsapp:+14155238886",
            "From": "whatsapp:+5491111111111",
            "MessageSid": "SM1",
            "ProfileName": "Mateo",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/xml")
    assert "<Response><Message>Registre: Hacer informe. Confirmas?</Message></Response>" in response.text
    assert saved["inbound"]["body"] == "Yo hago el informe"
    assert saved["task"]["source_message_id"] == "inbound-1"


def test_whatsapp_audio_returns_twiml_after_transcription(monkeypatch):
    saved = setup_registered_sender(monkeypatch)

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
            "To": "whatsapp:+14155238886",
            "From": "whatsapp:+5491111111111",
            "MessageSid": "SM2",
            "ProfileName": "Laura",
        },
    )

    assert response.status_code == 200
    assert "Registre: Coordinar taller - 2026-06-12. Confirmas?" in response.text
    assert saved["inbound"]["body"] == "Transcripcion del audio"


def test_whatsapp_audio_failure_returns_clarification(monkeypatch):
    setup_registered_sender(monkeypatch)

    async def fake_normalize(form, settings):
        raise RuntimeError("download failed")

    monkeypatch.setattr("app.routers.whatsapp.normalize_twilio_message", fake_normalize)

    response = client.post(
        "/whatsapp",
        data={
            "NumMedia": "1",
            "MediaUrl0": "https://api.twilio.com/media",
            "MediaContentType0": "audio/ogg",
            "To": "whatsapp:+14155238886",
            "From": "whatsapp:+5491111111111",
            "MessageSid": "SM3",
        },
    )

    assert response.status_code == 200
    assert "No entendi bien" in response.text


def test_unknown_sender_returns_unregistered_without_processing(monkeypatch):
    async def fail_normalize(form, settings):
        raise AssertionError("normalization should not run for unknown sender")

    monkeypatch.setattr("app.routers.whatsapp.get_db", lambda: object())
    monkeypatch.setattr(
        "app.routers.whatsapp.resolve_channel",
        lambda db, to_number: Channel(id="channel-1", organization_id="org-1"),
    )
    monkeypatch.setattr("app.routers.whatsapp.resolve_sender", lambda db, organization_id, from_number: None)
    monkeypatch.setattr("app.routers.whatsapp.normalize_twilio_message", fail_normalize)

    response = client.post(
        "/whatsapp",
        data={
            "Body": "Yo hago el informe",
            "To": "whatsapp:+14155238886",
            "From": "whatsapp:+5499999999999",
            "MessageSid": "SM4",
        },
    )

    assert response.status_code == 200
    assert "No te tengo registrado" in response.text


def test_duplicate_message_returns_existing_task(monkeypatch):
    async def fail_normalize(form, settings):
        raise AssertionError("normalization should not run for duplicate message")

    monkeypatch.setattr("app.routers.whatsapp.get_db", lambda: object())
    monkeypatch.setattr(
        "app.routers.whatsapp.resolve_channel",
        lambda db, to_number: Channel(id="channel-1", organization_id="org-1"),
    )
    monkeypatch.setattr(
        "app.routers.whatsapp.resolve_sender",
        lambda db, organization_id, from_number: Sender(id="person-1", display_name="Mateo"),
    )
    monkeypatch.setattr(
        "app.routers.whatsapp.get_existing_inbound",
        lambda db, organization_id, sid: {"id": "inbound-1", "body": "Yo hago el informe"},
    )
    monkeypatch.setattr(
        "app.routers.whatsapp.get_task_for_inbound",
        lambda db, organization_id, inbound_id: {
            "owner_name": "Mateo",
            "task_title": "Hacer informe",
            "description": None,
            "due_date": None,
            "priority": "normal",
            "confidence": 0.9,
        },
    )
    monkeypatch.setattr("app.routers.whatsapp.normalize_twilio_message", fail_normalize)

    response = client.post(
        "/whatsapp",
        data={
            "Body": "Yo hago el informe",
            "To": "whatsapp:+14155238886",
            "From": "whatsapp:+5491111111111",
            "MessageSid": "SM1",
        },
    )

    assert response.status_code == 200
    assert "Registre: Hacer informe. Confirmas?" in response.text


def test_low_confidence_saves_inbound_without_task(monkeypatch):
    saved = setup_registered_sender(monkeypatch)

    async def fake_normalize(form, settings):
        return "No se entiende"

    async def fake_extract(message_text, sender, settings):
        return ExtractedTask(
            intent="task_creation",
            owner="Mateo",
            task_title="Tarea dudosa",
            description=None,
            due_date=None,
            status="pending",
            priority="normal",
            confidence=0.4,
        )

    def fail_save_task(db, organization_id, inbound, sender, task):
        raise AssertionError("low-confidence extraction should not create a task")

    monkeypatch.setattr("app.routers.whatsapp.normalize_twilio_message", fake_normalize)
    monkeypatch.setattr("app.routers.whatsapp.extract_task", fake_extract)
    monkeypatch.setattr("app.routers.whatsapp.save_task", fail_save_task)

    response = client.post(
        "/whatsapp",
        data={
            "Body": "No se entiende",
            "To": "whatsapp:+14155238886",
            "From": "whatsapp:+5491111111111",
            "MessageSid": "SM5",
        },
    )

    assert response.status_code == 200
    assert "No entendi bien" in response.text
    assert saved["inbound"]["body"] == "No se entiende"
    assert "task" not in saved
