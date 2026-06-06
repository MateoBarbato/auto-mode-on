# Project assignment reply (WhatsApp follow-up → strict JSON)

Used when the user answers the **project disambiguation** message sent after
[`task-extraction.md`](./task-extraction.md) returns `needs_clarification`.

## Inputs (provided by n8n)

| Variable | Source | Required |
|---|---|---|
| `user_reply` | WhatsApp body (e.g. `"0"`, `"individual"`, `"2"`, `"Taller nutrición"`) | yes |
| `draft_task` | Stored JSON from first extraction (owner, task_title, due_date, …) | yes |
| `offered_projects` | Same list sent to user: `[{ "index": 1, "id", "name" }, …]` | yes |

Always include option **0 = individual / sin proyecto** in `offered_projects` metadata
(n8n adds it; not a DB project).

## System instructions (summary)

The user is choosing where to file a task that was already parsed.

1. Map the reply to:
   - **global** → `is_global: true`, `project_id: null` (options: `G`, "global", "toda la org", "organización")
   - **standalone** → `is_global: false`, `project_id: null` (options: `0`, "individual", "suelta", "sin proyecto", "ninguno")
   - **project** → `is_global: false`, `project_id` from `offered_projects` (by number or fuzzy name match)
2. If the reply is ambiguous or unrelated, return `intent: "clarification_failed"`.
3. Return strict JSON only.

## Output schema

```json
{
  "intent": "project_assignment_confirmed | clarification_failed",
  "is_global": false,
  "project_resolution": {
    "status": "global | standalone | matched",
    "project_id": "uuid | null",
    "project_name_matched": "string | null",
    "confidence": 0.95
  },
  "user_reply_interpreted": "string",
  "confirmation_message": "string in Spanish for WhatsApp"
}
```

## n8n actions after success

When `intent === "project_assignment_confirmed"`:

1. Merge `draft_task` + `is_global` + `project_resolution.project_id`
2. `INSERT INTO tasks (...)` with `source_type = 'whatsapp'`
3. Send `confirmation_message` via Twilio
4. Delete / mark draft as `confirmed`

When `clarification_failed`:

```text
No entendí tu respuesta. Respondé:
0 — Tarea individual
G — Tarea global (toda la organización)
{numbered_list_again}
```

Re-use the same draft; do not create duplicate tasks.

## Examples

**Reply:** `G`

```json
{
  "intent": "project_assignment_confirmed",
  "is_global": true,
  "project_resolution": {
    "status": "global",
    "project_id": null,
    "project_name_matched": null,
    "confidence": 0.99
  },
  "user_reply_interpreted": "Tarea global",
  "confirmation_message": "Listo: Coordinar espacio para el taller — tarea global de la organización. ¿Algo más?"
}
```

**Reply:** `0`

```json
{
  "intent": "project_assignment_confirmed",
  "is_global": false,
  "project_resolution": {
    "status": "standalone",
    "project_id": null,
    "project_name_matched": null,
    "confidence": 0.98
  },
  "user_reply_interpreted": "Tarea individual",
  "confirmation_message": "Listo: Coordinar espacio para el taller — tarea individual. ¿Algo más?"
}
```

**Reply:** `2`

```json
{
  "intent": "project_assignment_confirmed",
  "project_resolution": {
    "status": "matched",
    "project_id": "p1111111-1111-1111-1111-111111111112",
    "project_name_matched": "Taller nutrición comunitaria",
    "confidence": 0.96
  },
  "user_reply_interpreted": "Opción 2",
  "confirmation_message": "Listo: Coordinar espacio para el taller — dentro de Taller nutrición comunitaria. ¿Algo más?"
}
```

**Reply:** `el del informe`

```json
{
  "intent": "project_assignment_confirmed",
  "project_resolution": {
    "status": "matched",
    "project_id": "p1111111-1111-1111-1111-111111111111",
    "project_name_matched": "Informe financiador Q2",
    "confidence": 0.82
  },
  "user_reply_interpreted": "Referencia al informe / financiador",
  "confirmation_message": "Listo: … — dentro de Informe financiador Q2. ¿Algo más?"
}
```

## Rule-based fallback (optional)

If `user_reply` is exactly `0`, `G`, or `1`–`9` and matches an offered option, n8n may resolve
**without** calling the LLM. Use the LLM when the reply is free text.
