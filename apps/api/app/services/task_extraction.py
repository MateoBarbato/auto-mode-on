"""OpenAI-backed task extraction for normalized WhatsApp text."""

import asyncio
import json
from datetime import UTC, datetime

from openai import OpenAI
from pydantic import ValidationError

from app.config import Settings
from app.models.task import ExtractedTask


class ExtractionError(RuntimeError):
    """Raised when OpenAI extraction cannot return a valid task."""


SYSTEM_PROMPT = """You are a task extraction assistant for an NGO team.
Extract task commitments from WhatsApp messages and return ONLY strict JSON - no markdown, no prose outside the JSON object.

Rules:
- owner: person committing (use sender name for first-person, e.g. "yo" / "me encargo")
- task_title: concise title in the same language as the message
- due_date: resolve relative dates using today's date, return YYYY-MM-DD or null
- priority: low | normal | high | urgent (default normal; urgent = very imminent deadline)
- confidence: 0.0 to 1.0

Return exactly this JSON shape:
{"intent":"task_creation","owner":"...","task_title":"...","description":null,"due_date":null,"status":"pending","priority":"normal","confidence":0.9}"""


async def extract_task(message_body: str, sender_name: str, settings: Settings) -> ExtractedTask:
    if not settings.openai_api_key:
        raise ExtractionError("OPENAI_API_KEY is required for task extraction")

    today = datetime.now(UTC).date().isoformat()
    response = await asyncio.to_thread(
        _create_extraction_response,
        message_body,
        sender_name,
        today,
        settings,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        return ExtractedTask.model_validate(json.loads(raw))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ExtractionError("Task extraction returned invalid JSON") from exc


def _create_extraction_response(
    message_body: str,
    sender_name: str,
    today: str,
    settings: Settings,
):
    client = OpenAI(api_key=settings.openai_api_key)
    return client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=512,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nToday: {today}"},
            {"role": "user", "content": f"Sender: {sender_name}\nMessage: {message_body}"},
        ],
    )
