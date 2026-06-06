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
