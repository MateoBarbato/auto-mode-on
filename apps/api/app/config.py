"""Application configuration.

Reads the environment variables documented in
`docs/architecture/overview.md` §9. Provided to the backend as env vars; no
secrets are committed (see `.env.example`).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase / Postgres
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # LLM (OpenAI GPT-4o-mini — see ADR 0010; matches the TS prototype)
    openai_api_key: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""  # e.g. whatsapp:+14155238886

    # Shared secret so only the n8n cron can call POST /reminders/run
    reminder_trigger_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
