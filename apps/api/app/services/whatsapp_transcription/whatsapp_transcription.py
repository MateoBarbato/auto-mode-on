"""Normalize WhatsApp text/audio payloads and transcribe Twilio media."""

import asyncio
import subprocess
import tempfile
from pathlib import Path

import httpx
import imageio_ffmpeg
from openai import OpenAI

from app.config import Settings


class UnsupportedMessageError(RuntimeError):
    """Raised when a Twilio payload cannot be turned into text."""


class TranscriptionError(RuntimeError):
    """Raised when media cannot be downloaded, converted, or transcribed."""


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


async def transcribe_twilio_audio(
    media_url: str,
    content_type: str,
    settings: Settings,
) -> str:
    audio_bytes = await download_twilio_media(media_url, settings)
    mp3_bytes = await asyncio.to_thread(convert_audio_to_mp3, audio_bytes, content_type)
    transcript = await asyncio.to_thread(_transcribe_mp3, mp3_bytes, settings)
    transcript = transcript.strip()

    if not transcript:
        raise TranscriptionError("Transcription returned empty text")

    return transcript


async def download_twilio_media(media_url: str, settings: Settings) -> bytes:
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        raise TranscriptionError("Twilio credentials are required to download media")

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            media_url,
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
        )

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise TranscriptionError("Twilio media download failed") from exc

    return response.content


def convert_audio_to_mp3(audio_bytes: bytes, content_type: str) -> bytes:
    suffix = _suffix_for_content_type(content_type)

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = Path(tmpdir) / f"input{suffix}"
        output_path = Path(tmpdir) / "output.mp3"
        input_path.write_bytes(audio_bytes)

        command = [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-y",
            "-i",
            str(input_path),
            "-ac",
            "1",
            "-ar",
            "16000",
            str(output_path),
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise TranscriptionError("Audio conversion failed")

        return output_path.read_bytes()


def _transcribe_mp3(mp3_bytes: bytes, settings: Settings) -> str:
    if not settings.openai_api_key:
        raise TranscriptionError("OPENAI_API_KEY is required for transcription")

    client = OpenAI(api_key=settings.openai_api_key)

    with tempfile.NamedTemporaryFile(suffix=".mp3") as audio_file:
        audio_file.write(mp3_bytes)
        audio_file.flush()
        with open(audio_file.name, "rb") as file_handle:
            result = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=file_handle,
            )

    return result.text


def _suffix_for_content_type(content_type: str) -> str:
    normalized = content_type.split(";")[0].strip().lower()
    return {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".mp4",
        "audio/m4a": ".m4a",
        "audio/ogg": ".ogg",
        "audio/opus": ".ogg",
        "audio/wav": ".wav",
        "audio/wave": ".wav",
        "audio/webm": ".webm",
    }.get(normalized, ".audio")


def _parse_int(value: str | None) -> int:
    try:
        return int(value or "0")
    except ValueError:
        return 0
