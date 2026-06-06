"""Reminder loop trigger.

Owner: P2 (this lane). POST /reminders/run is called by the n8n cron and is
guarded by REMINDER_TRIGGER_SECRET — never publicly callable (ADR 0010).
Skeleton stub: fleshed out in Phase 3 (fetch due tasks → send → dedup).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post("/run")
async def run() -> dict[str, str]:
    # TODO(P2, Phase 3): auth via shared secret → fetch due tasks →
    # send via twilio_client → record in `reminders` with dedup.
    return {"status": "not_implemented"}
