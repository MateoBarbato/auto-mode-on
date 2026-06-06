# MVP Definition

## Product Thesis

NGOs do not fail because they lack tools. They fail because each new tool adds friction, setup, training, and process overhead. The system must live on top of the channel they already use: WhatsApp.

Halketon is a WhatsApp-first operational memory layer. It captures commitments from existing conversations, structures them with an LLM, stores them in Postgres, and gives leadership a simple view of load, deadlines, and follow-up risk.

## Primary User

The primary user is an overloaded NGO operator or coordinator who already coordinates work through WhatsApp and meetings.

The secondary user is a director or team lead who needs visibility into:

- Open tasks.
- Overdue commitments.
- Owners with high load.
- Tasks without clear ownership.
- Upcoming deadlines.

## Hero Use Case

Input:

```text
Yo me encargo del informe para el viernes
```

Structured output:

```json
{
  "intent": "task_creation",
  "owner": "Mateo",
  "task": "Preparar informe",
  "due_date": "2026-06-12",
  "status": "pending",
  "priority": "normal",
  "confidence": 0.94
}
```

Immediate response:

```text
Registre: Informe - viernes. Confirmas?
```

## Features

### WhatsApp Task Capture

Converts natural-language WhatsApp messages into structured tasks.

Supported in the first MVP:

- Short text messages.
- Short voice-note transcript text once transcription is available.
- 1:1 Twilio Sandbox messages.

### Meeting Memory

Converts a transcript into a summary plus a list of commitments.

Supported in the first MVP:

- Paste/upload transcript.
- Extract owner, task, due date, and priority.
- Store resulting tasks.

### Reminder Engine

Sends follow-up messages for overdue or soon-due tasks.

Supported replies:

- `done`
- `in_progress`
- `blocked`

### Team Visibility Dashboard

Shows leadership the operational picture:

- Open task count.
- Overdue task count.
- Load by person.
- Deadlines this week.
- Tasks without owner.

## Non-goals

- Replacing WhatsApp.
- Replacing Asana, Jira, Trello, Notion, or Slack.
- Building a full CRM.
- Solving donations or fundraising.
- Complex permissions and organization management.
- Multi-tenant SaaS.

## Demo Script

1. Send a WhatsApp message to the Twilio Sandbox number.
2. Show n8n receiving the webhook.
3. Show strict JSON returned by the LLM.
4. Show the task in Supabase.
5. Open the dashboard and show the task by owner and deadline.
6. Trigger a reminder workflow.
7. Reply with a quick status and show the dashboard update.

