# Halketon API (FastAPI)

The programmatic backend that owns the pipeline: WhatsApp webhook → LLM
extraction → validation → Postgres → outbound replies + reminders. See
[ADR 0010](../../docs/decisions/0010-programmatic-fastapi-pipeline.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Quick start

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# config — copy the repo-root example and fill in secrets
cp ../../.env.example .env

# run
uvicorn app.main:app --reload --port 8000
curl localhost:8000/health   # {"ok": true}
```

Expose locally for Twilio with a tunnel (`ngrok http 8000` /
`cloudflared`) and paste the URL into the Twilio Sandbox "when a message comes
in" field.

## Tests

```bash
pytest
```

## Layout

| Path | Owner | Purpose |
|---|---|---|
| `app/main.py` | P4 (shared) | App factory + router wiring + `/health` |
| `app/config.py` | shared | Env-var settings (`overview.md` §9) |
| `app/db/` | P4 (shared) | Supabase/Postgres access |
| `app/models/` | P4 | Pydantic strict-JSON schemas |
| `app/routers/whatsapp.py` | P1 | Inbound capture webhook |
| `app/routers/reminders.py` | P2 | `/reminders/run` (auth'd by secret) |
| `app/routers/meetings.py` | P4 | Transcript → summary + tasks |
| `app/services/` | P1/P2 | `capture.py`, `twilio_client.py`, `follow_up.py` |

> Routers marked "not started" return `{"status": "not_implemented"}`. This is
> the skeleton — each owner fills their lane.
