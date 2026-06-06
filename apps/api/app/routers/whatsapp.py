"""Inbound WhatsApp webhook.

Owner: P1 (capture module). This v1 hook handles Twilio text/audio payloads,
normalizes them into text, runs task extraction, and returns TwiML.
"""

import logging

from fastapi import APIRouter, Request, Response

from app.config import get_settings
from app.db.client import get_db
from app.models.task import ExtractedTask
from app.services.capture import (
    get_existing_inbound,
    get_task_for_inbound,
    resolve_channel,
    resolve_sender,
    save_inbound_message,
    save_task,
)
from app.services.task_extraction import extract_task
from app.services.twiml import clarification_reply, confirmation_reply, unregistered_sender_reply
from app.services.whatsapp_transcription import normalize_twilio_message

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
logger = logging.getLogger(__name__)


@router.post("")
async def inbound(request: Request) -> Response:
    settings = get_settings()
    form = {key: str(value) for key, value in (await request.form()).items()}
    if not form.get("To") or not form.get("From"):
        return _twiml_response(unregistered_sender_reply())

    db = get_db()

    channel = resolve_channel(db, form.get("To", ""))
    if channel is None:
        return _twiml_response(unregistered_sender_reply())

    sender = resolve_sender(db, channel.organization_id, form.get("From", ""))
    if sender is None:
        return _twiml_response(unregistered_sender_reply())

    inbound = get_existing_inbound(db, channel.organization_id, form.get("MessageSid", ""))
    if inbound:
        existing_task = get_task_for_inbound(db, channel.organization_id, inbound["id"])
        if existing_task:
            return _twiml_response(confirmation_reply(_task_from_row(existing_task)))

    try:
        message_text = (inbound or {}).get("body") or await normalize_twilio_message(form, settings)
        inbound = save_inbound_message(
            db,
            channel.organization_id,
            form,
            message_text,
            form.get("ProfileName") or sender.display_name,
        )
        task = await extract_task(message_text, sender.display_name, settings)
    except Exception as exc:
        logger.exception("WhatsApp capture error: %s", exc)
        return _twiml_response(clarification_reply())

    if task.confidence < 0.6:
        return _twiml_response(clarification_reply())

    save_task(db, channel.organization_id, inbound, sender, task)
    return _twiml_response(confirmation_reply(task))


def _twiml_response(body: str) -> Response:
    return Response(content=body, media_type="text/xml")


def _task_from_row(row: dict[str, object]) -> ExtractedTask:
    return ExtractedTask(
        intent="task_creation",
        owner=str(row.get("owner_name") or ""),
        task_title=str(row.get("task_title") or ""),
        description=row.get("description") if isinstance(row.get("description"), str) else None,
        due_date=row.get("due_date") if isinstance(row.get("due_date"), str) else None,
        status="pending",
        priority=row.get("priority") if row.get("priority") in {"low", "normal", "high", "urgent"} else "normal",
        confidence=float(row.get("confidence") or 1),
    )
