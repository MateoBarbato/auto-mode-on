# WhatsApp welcome / redirect reply

Parse user replies to the **welcome or org-redirect menu** from
[`whatsapp-org-resolution.md`](./whatsapp-org-resolution.md).

## Inputs

| Variable | Source |
|---|---|
| `user_reply` | WhatsApp body |
| `session` | `whatsapp_sessions` row (status, organization_id, people_id) |
| `organization_name` | From resolved org |
| `other_org_channels` | Cross-org lookup result (for redirect menu) |

## Output schema

```json
{
  "intent": "welcome_confirmed | redirect_acknowledged | request_access | clarification_failed",
  "session_status": "active | awaiting_org_redirect | expired",
  "people_id": "uuid | null",
  "confirmation_message": "string in Spanish"
}
```

## n8n actions

| `intent` | Action |
|---|---|
| `welcome_confirmed` | Update session → `active`, set `people_id`; ready for tasks |
| `redirect_acknowledged` | Send number of target org; session → `expired` |
| `request_access` | Notify org admin (email/dashboard); session stays pending |
| `clarification_failed` | Re-send menu |

## Rule-based mapping (preferred)

| Reply | When | Result |
|---|---|---|
| `1` | `awaiting_welcome` + people known | `welcome_confirmed` → active |
| `2` | `awaiting_welcome` | Report / expire session |
| `1`, `2`, … | `awaiting_org_redirect` | Pick org from numbered list |

Use LLM only for free-text replies.
