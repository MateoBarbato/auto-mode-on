"""Inbound WhatsApp webhook.

Owner: P1 (capture module) — shares the intent branch with P2.
Skeleton stub: routes exist so the app boots; P1 fills the capture path
(save inbound_messages → LLM extract → validate → branch on intent).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.post("")
async def inbound() -> dict[str, str]:
    # TODO(P1): signature check (P2 helper) → save inbound → extract → branch.
    return {"status": "not_implemented"}
