import pytest

from app.services.whatsapp_messages import UnsupportedMessageError, normalize_twilio_message


class Settings:
    openai_api_key = "test-openai-key"
    twilio_account_sid = "test-sid"
    twilio_auth_token = "test-token"


@pytest.mark.asyncio
async def test_text_payload_returns_body():
    text = await normalize_twilio_message({"Body": "Yo hago el informe"}, Settings())

    assert text == "Yo hago el informe"


@pytest.mark.asyncio
async def test_audio_payload_transcribes(monkeypatch):
    async def fake_transcribe(media_url, content_type, settings):
        assert media_url == "https://api.twilio.com/media"
        assert content_type == "audio/ogg"
        return "Transcripcion lista"

    monkeypatch.setattr(
        "app.services.whatsapp_messages.transcribe_twilio_audio",
        fake_transcribe,
    )

    text = await normalize_twilio_message(
        {
            "NumMedia": "1",
            "MediaUrl0": "https://api.twilio.com/media",
            "MediaContentType0": "audio/ogg",
        },
        Settings(),
    )

    assert text == "Transcripcion lista"


@pytest.mark.asyncio
async def test_non_audio_media_is_unsupported():
    with pytest.raises(UnsupportedMessageError):
        await normalize_twilio_message(
            {
                "NumMedia": "1",
                "MediaUrl0": "https://api.twilio.com/media",
                "MediaContentType0": "image/jpeg",
            },
            Settings(),
        )
