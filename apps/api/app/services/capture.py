"""Persist WhatsApp capture rows in Supabase."""

from dataclasses import dataclass
from typing import Any

from supabase import Client

from app.models.task import ExtractedTask


class CaptureError(RuntimeError):
    """Raised when capture persistence cannot continue."""


@dataclass(frozen=True)
class Channel:
    id: str
    organization_id: str


@dataclass(frozen=True)
class Sender:
    id: str
    display_name: str


def resolve_channel(db: Client, to_number: str) -> Channel | None:
    if not to_number:
        return None

    result = (
        db.table("organization_channels")
        .select("id, organization_id")
        .eq("whatsapp_number", to_number)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    row = _first_row(result)
    if not row:
        return None

    return Channel(id=row["id"], organization_id=row["organization_id"])


def resolve_sender(db: Client, organization_id: str, from_number: str) -> Sender | None:
    if not organization_id or not from_number:
        return None

    result = (
        db.table("people")
        .select("id, display_name")
        .eq("organization_id", organization_id)
        .eq("whatsapp_number", from_number)
        .limit(1)
        .execute()
    )
    row = _first_row(result)
    if not row:
        return None

    return Sender(id=row["id"], display_name=row["display_name"])


def get_existing_inbound(db: Client, organization_id: str, message_sid: str) -> dict[str, Any] | None:
    if not message_sid:
        return None

    result = (
        db.table("inbound_messages")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("provider", "twilio")
        .eq("provider_message_id", message_sid)
        .limit(1)
        .execute()
    )
    return _first_row(result)


def get_task_for_inbound(db: Client, organization_id: str, inbound_id: str) -> dict[str, Any] | None:
    result = (
        db.table("tasks")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("idempotency_key", _task_idempotency_key(inbound_id))
        .limit(1)
        .execute()
    )
    return _first_row(result)


def save_inbound_message(
    db: Client,
    organization_id: str,
    form: dict[str, str],
    normalized_text: str,
    sender_name: str,
) -> dict[str, Any]:
    existing = get_existing_inbound(db, organization_id, form.get("MessageSid", ""))
    if existing:
        return existing

    payload = {
        "organization_id": organization_id,
        "provider": "twilio",
        "provider_message_id": form.get("MessageSid") or None,
        "sender_phone": form.get("From", ""),
        "sender_name": sender_name,
        "body": normalized_text,
        "media_url": form.get("MediaUrl0") or None,
        "raw_payload": form,
    }
    result = db.table("inbound_messages").insert(payload).execute()
    row = _first_row(result)
    if not row:
        raise CaptureError("Failed to insert inbound message")

    return row


def save_task(
    db: Client,
    organization_id: str,
    inbound: dict[str, Any],
    sender: Sender,
    task: ExtractedTask,
) -> dict[str, Any]:
    existing = get_task_for_inbound(db, organization_id, inbound["id"])
    if existing:
        return existing

    payload = {
        "organization_id": organization_id,
        "owner_id": sender.id,
        "owner_name": task.owner,
        "task_title": task.task_title,
        "description": task.description,
        "due_date": task.due_date,
        "status": task.status,
        "priority": task.priority,
        "source_message_id": inbound["id"],
        "source_type": "whatsapp",
        "source_text": inbound.get("body"),
        "confidence": round(task.confidence, 2),
        "extraction_payload": task.model_dump(),
        "idempotency_key": _task_idempotency_key(inbound["id"]),
    }
    result = db.table("tasks").insert(payload).execute()
    row = _first_row(result)
    if not row:
        raise CaptureError("Failed to insert task")

    return row


def _task_idempotency_key(inbound_id: str) -> str:
    return f"task:msg:{inbound_id}"


def _first_row(result: Any) -> dict[str, Any] | None:
    data = getattr(result, "data", None)
    if isinstance(data, list) and data:
        return data[0]
    return None
