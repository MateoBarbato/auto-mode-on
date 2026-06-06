from app.models.task import ExtractedTask
from app.services.capture import (
    Sender,
    resolve_channel,
    resolve_sender,
    save_inbound_message,
    save_task,
)


class Result:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.filters = {}
        self.insert_payload = None

    def select(self, columns):
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def limit(self, count):
        return self

    def insert(self, payload):
        self.insert_payload = payload
        return self

    def execute(self):
        if self.insert_payload is not None:
            row = {**self.insert_payload, "id": f"{self.table_name}-1"}
            self.db.rows.setdefault(self.table_name, []).append(row)
            return Result([row])

        rows = self.db.rows.get(self.table_name, [])
        filtered = [
            row
            for row in rows
            if all(row.get(key) == value for key, value in self.filters.items())
        ]
        return Result(filtered[:1])


class FakeDb:
    def __init__(self):
        self.rows = {
            "organization_channels": [
                {
                    "id": "channel-1",
                    "organization_id": "org-1",
                    "whatsapp_number": "whatsapp:+14155238886",
                    "is_active": True,
                }
            ],
            "people": [
                {
                    "id": "person-1",
                    "organization_id": "org-1",
                    "whatsapp_number": "whatsapp:+5491111111111",
                    "display_name": "Mateo",
                }
            ],
            "inbound_messages": [],
            "tasks": [],
        }

    def table(self, table_name):
        return FakeQuery(self, table_name)


def test_resolve_channel_and_sender():
    db = FakeDb()

    channel = resolve_channel(db, "whatsapp:+14155238886")
    sender = resolve_sender(db, "org-1", "whatsapp:+5491111111111")

    assert channel is not None
    assert channel.organization_id == "org-1"
    assert sender is not None
    assert sender.id == "person-1"


def test_save_inbound_and_task_payloads():
    db = FakeDb()
    form = {
        "MessageSid": "SM1",
        "From": "whatsapp:+5491111111111",
        "ProfileName": "Mateo",
        "MediaUrl0": "https://api.twilio.com/media",
    }
    task = ExtractedTask(
        intent="task_creation",
        owner="Mateo",
        task_title="Preparar informe",
        description=None,
        due_date="2026-06-12",
        status="pending",
        priority="high",
        confidence=0.91,
    )

    inbound = save_inbound_message(db, "org-1", form, "Texto normalizado", "Mateo")
    saved = save_task(db, "org-1", inbound, Sender(id="person-1", display_name="Mateo"), task)

    assert inbound["provider"] == "twilio"
    assert inbound["provider_message_id"] == "SM1"
    assert inbound["body"] == "Texto normalizado"
    assert inbound["raw_payload"] == form
    assert saved["source_message_id"] == inbound["id"]
    assert saved["source_type"] == "whatsapp"
    assert saved["idempotency_key"] == f"task:msg:{inbound['id']}"
    assert saved["owner_id"] == "person-1"
