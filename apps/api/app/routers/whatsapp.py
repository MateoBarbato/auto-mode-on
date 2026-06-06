"""Inbound WhatsApp webhook.

Owner: P1 (capture module). This v1 hook handles Twilio text/audio payloads,
normalizes them into text, runs task extraction, and returns TwiML.
"""

import logging

from fastapi import APIRouter, Request, Response

from app.config import get_settings
from app.services.task_extraction import extract_task
from app.services.twiml import clarification_reply, confirmation_reply
from app.services.whatsapp_messages import normalize_twilio_message

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
logger = logging.getLogger(__name__)


@router.post("")
async def inbound(request: Request) -> Response:
    settings = get_settings()
    form = {key: str(value) for key, value in (await request.form()).items()}
    sender = form.get("ProfileName") or form.get("From") or "WhatsApp"

    try:
        message_text = await normalize_twilio_message(form, settings)
        task = await extract_task(message_text, sender, settings)
    except Exception as exc:
        logger.exception("WhatsApp capture error: %s", exc)
        return _twiml_response(clarification_reply())

    if task.confidence < 0.6:
        return _twiml_response(clarification_reply())

    return _twiml_response(confirmation_reply(task))


def _twiml_response(body: str) -> Response:
    return Response(content=body, media_type="text/xml")
