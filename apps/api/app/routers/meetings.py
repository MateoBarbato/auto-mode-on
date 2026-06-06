"""Meeting transcript → summary + tasks endpoint.

Owner: P4 (meeting flow) — consumed by P3's dashboard meeting form.
Skeleton stub: contract is POST /meetings { transcript } → { summary, tasks[] }.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("")
async def create_meeting() -> dict[str, str]:
    # TODO(P4): run prompts/meeting-summary.md → insert meetings + tasks +
    # meeting_tasks → return { summary, tasks[] }.
    return {"status": "not_implemented"}
