# Task extraction prompt (WhatsApp → strict JSON)

Used by n8n after saving `inbound_messages`. The LLM structures natural language into
a task and **classifies its scope**: global (whole org), project, or standalone individual.

## Inputs (provided by n8n)

| Variable | Source | Required |
|---|---|---|
| `message_body` | WhatsApp body | yes |
| `sender_name` | Twilio ProfileName or `people.display_name` | yes |
| `sender_phone` | Twilio From | yes |
| `current_date` | workflow `$now` (ISO date) | yes |
| `organization_name` | `organizations.name` | yes |
| `organization_id` | Pre-resolved via [`whatsapp-org-resolution.md`](./whatsapp-org-resolution.md) | yes |
| `people_id` | Validated `people.id` for sender in org | yes |
| `active_projects` | `SELECT id, name, slug, status FROM projects WHERE organization_id = ? AND status IN ('planning', 'active') ORDER BY name` | yes (may be `[]`) |

`active_projects` shape:

```json
[
  {
    "id": "p1111111-1111-1111-1111-111111111111",
    "name": "Informe financiador Q2",
    "slug": "informe-financiador-q2",
    "categories": ["Administración"]
  },
  {
    "id": "p1111111-1111-1111-1111-111111111112",
    "name": "Taller nutrición comunitaria",
    "slug": "taller-nutricion-comunitaria",
    "categories": ["Nutrición", "Educación"]
  }
]
```

## System instructions (summary)

You extract operational tasks from WhatsApp messages for an NGO team.

1. Parse owner, title, due date, priority, status (default `pending`).
2. **Scope (first)** — decide if the task is **global**, **project**, or **standalone**:
   - **Global** (`is_global: true`) when the commitment affects the **whole organization**
     (personería jurídica, auditoría institucional, campaña de toda la ONG, cumplimiento
     estatutario, "la fundación debe…", "toda la organización"). Global tasks never have
     `project_id`.
   - If not global, run **project resolution** (below).
3. **Project resolution** (only when `is_global: false`):
   - **Match** when the message explicitly names a project, or clearly refers to ongoing work
     that only fits one listed project (e.g. "el informe del financiador" → Informe Q2).
   - **Standalone** when the message is clearly ad-hoc (vencimientos puntuales, trámites
     de un área) or the user says "individual", "suelta", "sin proyecto".
   - **Needs clarification** when a task could belong to a project but you are not confident
     which one, or it might be standalone/global — do **not** guess; ask the user.
4. Return **strict JSON only** — no markdown, no prose outside the JSON object.
5. `confidence` is 0..1 for the overall extraction; nested confidences are separate.

## Output schema

```json
{
  "intent": "task_creation",
  "owner": "string",
  "task_title": "string",
  "description": "string | null",
  "due_date": "YYYY-MM-DD | null",
  "status": "pending",
  "priority": "low | normal | high | urgent",
  "confidence": 0.94,
  "is_global": false,
  "project_resolution": {
    "status": "matched | standalone | needs_clarification | not_applicable",
    "project_id": "uuid | null",
    "project_name_matched": "string | null",
    "confidence": 0.91,
    "reason": "short explanation in Spanish"
  },
  "scope_reason": "short explanation in Spanish",
  "ambiguities": ["string"]
}
```

When `is_global: true`, set `project_resolution.status` to `not_applicable` and all
`project_id` fields to null.

### Scope outcomes

| `is_global` | `project_resolution.status` | n8n action |
|---|---|---|
| `true` | `not_applicable` | Insert with `is_global = true`, `project_id = null` |
| `false` | `matched` | Insert with `project_id` |
| `false` | `standalone` | Insert individual (`is_global = false`, no project) |
| `false` | `needs_clarification` | Draft + disambiguation message |

### `project_resolution.status` (when not global)

| Value | Meaning | n8n action |
|---|---|---|
| `matched` | `project_id` set from `active_projects` | Insert task with `project_id`; confirm to user |
| `standalone` | Task is individual, `project_id` null | Insert task without project; confirm to user |
| `needs_clarification` | Cannot decide safely | **Do not insert task yet** — send disambiguation message (see below) |

## Disambiguation message (n8n template)

When `project_resolution.status === "needs_clarification"`, n8n sends:

```text
Registré: {task_title}{due_date_suffix}.

¿Dónde la ubicamos?
0 — Tarea individual (sin proyecto)
G — Tarea global (toda la organización)
{numbered_list_of_active_projects}

Respondé con 0, G, el número o el nombre del proyecto.
```

Example numbered list (from `active_projects`):

```text
1 — Informe financiador Q2
2 — Taller nutrición comunitaria
```

n8n must store a **draft** (workflow static data or `task_drafts` row) with the full JSON
and `offered_projects` until the user replies. Then call
[`project-assignment-reply.md`](./project-assignment-reply.md).

## Examples

### D — Global (org-wide)

**Message:** `Hay que renovar la personería jurídica de la fundación antes de septiembre`

```json
{
  "intent": "task_creation",
  "owner": "Laura",
  "task_title": "Renovar personería jurídica de la fundación",
  "description": null,
  "due_date": "2026-09-01",
  "status": "pending",
  "priority": "high",
  "confidence": 0.92,
  "is_global": true,
  "project_resolution": {
    "status": "not_applicable",
    "project_id": null,
    "project_name_matched": null,
    "confidence": 1.0,
    "reason": "Trámite institucional de toda la ONG."
  },
  "scope_reason": "Afecta a la organización en su conjunto, no a un proyecto operativo.",
  "ambiguities": []
}
```

### A — Matched to project (high confidence)

**Message:** `Yo me encargo del informe para el financiador, entrega el viernes`

**active_projects:** includes "Informe financiador Q2"

```json
{
  "intent": "task_creation",
  "owner": "Mateo",
  "task_title": "Preparar informe para financiador",
  "description": null,
  "due_date": "2026-06-12",
  "status": "pending",
  "priority": "high",
  "confidence": 0.93,
  "is_global": false,
  "project_resolution": {
    "status": "matched",
    "project_id": "p1111111-1111-1111-1111-111111111111",
    "project_name_matched": "Informe financiador Q2",
    "confidence": 0.88,
    "reason": "Menciona informe del financiador; coincide con un solo proyecto activo."
  },
  "ambiguities": []
}
```

### B — Standalone (ad-hoc)

**Message:** `Hay que renovar el certificado SSL del sitio antes del 20`

```json
{
  "intent": "task_creation",
  "owner": "Laura",
  "task_title": "Renovar certificado SSL del sitio",
  "description": null,
  "due_date": "2026-06-20",
  "status": "pending",
  "priority": "urgent",
  "confidence": 0.9,
  "is_global": false,
  "project_resolution": {
    "status": "standalone",
    "project_id": null,
    "project_name_matched": null,
    "confidence": 0.85,
    "reason": "Trámite técnico puntual; no referencia ningún proyecto activo."
  },
  "ambiguities": []
}
```

### C — Needs clarification

**Message:** `Mañana coordino el espacio para el taller`

**active_projects:** includes "Taller nutrición comunitaria" and others that mention talleres

```json
{
  "intent": "task_creation",
  "owner": "Ana",
  "task_title": "Coordinar espacio para el taller",
  "description": null,
  "due_date": "2026-06-07",
  "status": "pending",
  "priority": "normal",
  "confidence": 0.87,
  "is_global": false,
  "project_resolution": {
    "status": "needs_clarification",
    "project_id": null,
    "project_name_matched": null,
    "confidence": 0.45,
    "reason": "Menciona taller pero podría ser del proyecto Taller nutrición o tarea suelta."
  },
  "ambiguities": ["No queda claro si el taller pertenece a un proyecto formal."]
}
```

## Validation (n8n, before insert)

- Reject if `confidence < 0.6` unless `needs_clarification` (then only store draft).
- If `matched`, verify `project_id` exists in `active_projects` snapshot.
- Never insert when `needs_clarification` — wait for reply prompt.
- If `is_global`, verify sender may create global tasks (`can_create_global_tasks`); else
  ask director or save as standalone draft.
- Map `owner` to `people` row when possible; keep `owner_name` denormalized.

## Related

- Follow-up turn: [`project-assignment-reply.md`](./project-assignment-reply.md)
- Flow diagram: [`../docs/diagrams/flows.md`](../docs/diagrams/flows.md) §1b
- Data model: [`../docs/architecture/data-model.md`](../docs/architecture/data-model.md)
