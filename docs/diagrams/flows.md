# Runtime Flows

Sequence diagrams for the system's runtime behavior. For the static structure see
[`../architecture/overview.md`](../architecture/overview.md); for tables see
[`../architecture/data-model.md`](../architecture/data-model.md).

> **Reading these:** solid arrows are calls/messages, dashed arrows are returns.
> Steps marked _(planned)_ are not yet wired — see the implementation status in the
> architecture overview, §8.

---

## End-to-end lifecycle

How a single commitment travels from a chat message to a closed task.

```mermaid
flowchart LR
  M["WhatsApp message<br/>'Yo hago el informe<br/>para el viernes'"]
  --> X["LLM extraction<br/>(strict JSON)"]
  --> T[("Task stored<br/>owner · due · priority")]
  --> V["Dashboard shows<br/>open / overdue / load"]
  T --> R["Reminder sent<br/>when due"]
  R --> Q["Quick reply<br/>done / in_progress / blocked"]
  Q --> U["Task status updated"]
  U --> V
```

---

## 1a. WhatsApp org resolution (canal + identidad)

Before any task extraction, n8n resolves the org from the **Twilio `To` number** and
validates the **sender `From`** exists in `people` for that org. See
[`../../prompts/whatsapp-org-resolution.md`](../../prompts/whatsapp-org-resolution.md).

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant WhatsApp as Twilio (org-specific number)
  participant n8n
  participant DB as Supabase

  User->>WhatsApp: message to Fundación Esperanza line
  WhatsApp->>n8n: webhook From, To, Body
  n8n->>DB: organization_channels WHERE whatsapp_number = To
  DB-->>n8n: organization_id, channel_id
  n8n->>DB: people WHERE org + From
  alt Known in this org
    DB-->>n8n: people row
    n8n->>DB: upsert whatsapp_sessions → active
    Note over n8n: continue to task extraction (§1 / §1b)
  else Not in this org
    n8n->>DB: lookup other orgs for same From
    n8n->>WhatsApp: redirect menu or welcome / request access
    WhatsApp-->>User: menu (0, 1, G… or org list)
  end
```

**Dual layer:** `To` → org · `From` + org → authorized person. Same phone in two orgs
uses two different Twilio numbers (no collision).

---

## 1. WhatsApp task creation

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant WhatsApp as Twilio WhatsApp
  participant n8n
  participant LLM
  participant DB as Supabase
  participant Dashboard

  User->>WhatsApp: "Yo hago el informe para el viernes"
  WhatsApp->>n8n: POST webhook (From, ProfileName, Body)
  n8n->>DB: insert inbound_messages (raw payload)
  DB-->>n8n: message id
  n8n->>LLM: task-extraction prompt (message, sender, current_date)
  LLM-->>n8n: strict JSON {owner, task, due_date, priority, confidence}
  Note over n8n: validate JSON shape before insert
  n8n->>DB: insert tasks (linked to source_message_id)
  n8n->>WhatsApp: "Registré: Informe — viernes. ¿Confirmás?"
  WhatsApp-->>User: confirmation
  Dashboard->>DB: query task state
  DB-->>Dashboard: open / overdue / load by owner
```

---

## 1b. WhatsApp task creation with project disambiguation

When the LLM cannot confidently match a project, it asks the user before inserting the task.
See [`../../prompts/task-extraction.md`](../../prompts/task-extraction.md) and
[`../../prompts/project-assignment-reply.md`](../../prompts/project-assignment-reply.md).

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant WhatsApp as Twilio WhatsApp
  participant n8n
  participant LLM
  participant DB as Supabase

  User->>WhatsApp: "Mañana coordino el espacio del taller"
  WhatsApp->>n8n: POST webhook
  n8n->>DB: insert inbound_messages
  n8n->>DB: fetch active_projects (planning, active)
  DB-->>n8n: project list
  n8n->>LLM: task-extraction (message + active_projects)
  LLM-->>n8n: JSON project_resolution.status = needs_clarification
  n8n->>DB: insert task_drafts (extraction_payload, offered_projects)
  n8n->>WhatsApp: "Registré: … ¿Individual (0) o proyecto? 1—… 2—…"
  WhatsApp-->>User: disambiguation prompt

  User->>WhatsApp: "2"
  WhatsApp->>n8n: POST webhook (reply)
  n8n->>DB: fetch task_drafts by sender_phone (pending)
  DB-->>n8n: draft
  n8n->>LLM: project-assignment-reply (reply + draft + offered_projects)
  LLM-->>n8n: JSON project_id confirmed
  n8n->>DB: insert tasks (project_id or null)
  n8n->>DB: update task_drafts → confirmed, resolved_task_id
  n8n->>WhatsApp: "Listo: … dentro de Taller nutrición. ¿Algo más?"
  WhatsApp-->>User: confirmation
```

**Fast paths (no second turn):**

| `project_resolution.status` | Action |
|---|---|
| `matched` | Insert task with `project_id` immediately |
| `standalone` | Insert task individual (`is_global = false`, no project) |
| `is_global: true` | Insert global task (skip project flow) |
| `needs_clarification` | Draft + list: `0` individual, `G` global, numbered projects |

---

## 2. Meeting transcript extraction _(planned)_

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant Dashboard
  participant LLM
  participant DB as Supabase

  User->>Dashboard: paste / upload transcript
  Dashboard->>LLM: meeting-summary prompt (transcript, current_date)
  LLM-->>Dashboard: strict JSON {summary, tasks[], ambiguities[]}
  Dashboard->>DB: insert meeting (transcript + summary)
  Dashboard->>DB: insert tasks (source_type = 'meeting')
  Dashboard->>DB: insert meeting_tasks (link)
  Note over Dashboard,DB: optional: notify each assignee on WhatsApp
```

---

## 3. Reminder + status update

```mermaid
sequenceDiagram
  autonumber
  participant Scheduler as n8n Scheduler
  participant n8n
  participant DB as Supabase
  participant WhatsApp as Twilio WhatsApp
  participant User

  Scheduler->>n8n: scheduled trigger (every 6h)
  n8n->>DB: fetch tasks where due_date <= today<br/>and status in (pending, in_progress, blocked)
  DB-->>n8n: due tasks
  Note over n8n: skip tasks already reminded<br/>(reminders.sent_at) — planned dedup
  n8n->>WhatsApp: "Hace unos días quedó pendiente: X. ¿Cómo va?"
  n8n->>DB: insert reminders (scheduled_at, sent_at) — planned
  User->>WhatsApp: "done" / "in_progress" / "blocked"
  WhatsApp->>n8n: POST webhook (reply)
  n8n->>LLM: classify reply intent (status_update)
  n8n->>DB: update task status + reminders.response
```

### Quick-reply mapping

| Reply | Maps to |
|---|---|
| `done`, `hecho`, `listo`, `ok`, ✅ | `done` |
| `en proceso`, `sigo`, ⏳ | `in_progress` |
| `bloqueado`, `no puedo`, 🚫 | `blocked` |

Defined in [`../../prompts/task-extraction.md`](../../prompts/task-extraction.md).
