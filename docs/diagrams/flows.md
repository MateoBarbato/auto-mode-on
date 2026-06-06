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

Before any task extraction, the backend resolves the org from the **Twilio `To` number** and
validates the **sender `From`** exists in `people` for that org. See
[`../../prompts/whatsapp-org-resolution.md`](../../prompts/whatsapp-org-resolution.md).

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant WhatsApp as Twilio (org-specific number)
  participant API as FastAPI backend
  participant DB as Supabase

  User->>WhatsApp: message to Fundación Esperanza line
  WhatsApp->>API: webhook From, To, Body
  API->>DB: organization_channels WHERE whatsapp_number = To
  DB-->>API: organization_id, channel_id
  API->>DB: people WHERE org + From
  alt Known in this org
    DB-->>API: people row
    API->>DB: upsert whatsapp_sessions → active
    Note over API: continue to task extraction (§1 / §1b)
  else Not in this org
    API->>DB: lookup other orgs for same From
    API->>WhatsApp: redirect menu or welcome / request access
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
  participant API as FastAPI backend
  participant LLM
  participant DB as Supabase
  participant Dashboard

  User->>WhatsApp: "Yo hago el informe para el viernes"
  WhatsApp->>API: POST webhook (From, ProfileName, Body)
  API->>DB: insert inbound_messages (raw payload)
  DB-->>API: message id
  API->>LLM: task-extraction prompt (message, sender, current_date)
  LLM-->>API: strict JSON {owner, task, due_date, priority, confidence}
  Note over API: validate JSON shape before insert
  API->>DB: insert tasks (linked to source_message_id)
  API->>WhatsApp: "Registré: Informe — viernes. ¿Confirmás?"
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
  participant API as FastAPI backend
  participant LLM
  participant DB as Supabase

  User->>WhatsApp: "Mañana coordino el espacio del taller"
  WhatsApp->>API: POST webhook
  API->>DB: insert inbound_messages
  API->>DB: fetch active_projects (planning, active)
  DB-->>API: project list
  API->>LLM: task-extraction (message + active_projects)
  LLM-->>API: JSON project_resolution.status = needs_clarification
  API->>DB: insert task_drafts (extraction_payload, offered_projects)
  API->>WhatsApp: "Registré: … ¿Individual (0) o proyecto? 1—… 2—…"
  WhatsApp-->>User: disambiguation prompt

  User->>WhatsApp: "2"
  WhatsApp->>API: POST webhook (reply)
  API->>DB: fetch task_drafts by sender_phone (pending)
  DB-->>API: draft
  API->>LLM: project-assignment-reply (reply + draft + offered_projects)
  LLM-->>API: JSON project_id confirmed
  API->>DB: insert tasks (project_id or null)
  API->>DB: update task_drafts → confirmed, resolved_task_id
  API->>WhatsApp: "Listo: … dentro de Taller nutrición. ¿Algo más?"
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
  participant API as FastAPI backend
  participant LLM
  participant DB as Supabase

  User->>Dashboard: paste / upload transcript
  Dashboard->>API: POST /meetings { transcript }
  API->>LLM: meeting-summary prompt (transcript, current_date)
  LLM-->>API: strict JSON {summary, tasks[], ambiguities[]}
  API->>DB: insert meeting (transcript + summary)
  API->>DB: insert tasks (source_type = 'meeting')
  API->>DB: insert meeting_tasks (link)
  API-->>Dashboard: { summary, tasks[] }
  Note over API,DB: optional: notify each assignee on WhatsApp
```

---

## 3. Reminder + status update

The **n8n scheduled trigger** is the only thing n8n still does: it fires a cron and calls the
backend's authenticated `/reminders/run` endpoint. All logic — fetch, dedup, send, classify —
lives in the backend. Status replies arrive as ordinary inbound webhooks.

```mermaid
sequenceDiagram
  autonumber
  participant N8N as n8n (cron)
  participant API as FastAPI backend
  participant DB as Supabase
  participant LLM
  participant WhatsApp as Twilio WhatsApp
  participant User

  N8N->>API: POST /reminders/run (every 6h, shared secret)
  API->>DB: fetch tasks where due_date <= today<br/>and status in (pending, in_progress, blocked)
  DB-->>API: due tasks
  Note over API: skip tasks already reminded<br/>(reminders.sent_at) — dedup
  API->>WhatsApp: "Hace unos días quedó pendiente: X. ¿Cómo va?"
  API->>DB: insert reminders (scheduled_at, sent_at)
  User->>WhatsApp: "done" / "in_progress" / "blocked"
  WhatsApp->>API: POST webhook (reply)
  API->>LLM: classify reply intent (status_update)
  API->>DB: update task status + reminders.response
```

### Quick-reply mapping

| Reply | Maps to |
|---|---|
| `done`, `hecho`, `listo`, `ok`, ✅ | `done` |
| `en proceso`, `sigo`, ⏳ | `in_progress` |
| `bloqueado`, `no puedo`, 🚫 | `blocked` |

Defined in [`../../prompts/task-extraction.md`](../../prompts/task-extraction.md).
