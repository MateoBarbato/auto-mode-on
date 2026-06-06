"""Normalize Twilio WhatsApp webhook payloads into text."""

from app.config import Settings
from app.services.transcription import transcribe_twilio_audio


class UnsupportedMessageError(RuntimeError):
    """Raised when a Twilio payload cannot be turned into text."""


async def normalize_twilio_message(form: dict[str, str], settings: Settings) -> str:
    body = (form.get("Body") or "").strip()
    media_count = _parse_int(form.get("NumMedia"))
    media_url = form.get("MediaUrl0") or ""
    media_content_type = form.get("MediaContentType0") or ""

    if media_count > 0:
        if media_url and media_content_type.startswith("audio/"):
            return await transcribe_twilio_audio(media_url, media_content_type, settings)
        raise UnsupportedMessageError("Only audio media is supported")

    if body:
        return body

    raise UnsupportedMessageError("Message has no text or supported audio media")


def _parse_int(value: str | None) -> int:
    try:
        return int(value or "0")
    except ValueError:
        return 0
