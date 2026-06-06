# ADR 0010 - Programmatic FastAPI pipeline (n8n reduced to a scheduler)

## Status

Accepted (2026-06-06). **Supersedes the orchestration decision in [ADR 0001](./0001-mvp-stack.md)**
(Twilio, Supabase, Next.js and the LLM-with-strict-JSON choice from 0001 still stand).

## Context

ADR 0001 chose n8n as the orchestration layer with an explicit guardrail: *"n8n
orchestrates; it does not own business rules."* Since then the design has accumulated
real business logic — org resolution by Twilio number (ADR 0007), sender authorization,
multi-turn project disambiguation with `task_drafts` (ADR 0005), global-task routing
(ADR 0006), idempotency (ADR 0008), and proactive recurrence outreach (ADR 0009).

Expressing that logic as n8n nodes pushes against the 0001 guardrail and is hard to test,
version, and review. A working TypeScript prototype already lives in `src/` (webhook →
GPT-4o-mini extraction → TwiML reply), proving the pipeline is small enough to own in code.

## Decision

Move the pipeline into a **programmatic backend** and reduce n8n to a single role.

- **Backend: Python + FastAPI.** Receives the Twilio webhook **directly**, validates the
  Twilio signature, resolves org + sender, calls the LLM, validates output with **Pydantic**,
  persists to Postgres, and sends outbound WhatsApp replies via the Twilio SDK. This backend
  owns the business rules described in ADRs 0005–0009.
- **n8n: scheduler only.** n8n keeps **one** scheduled trigger that POSTs to the backend's
  `/reminders/run` endpoint on a cron. It carries **no business logic** and is **not** in the
  inbound path. Inbound WhatsApp never touches n8n.
- **Twilio webhook points at the backend**, not at n8n. The Sandbox "when a message comes in"
  field is repointed from the n8n webhook to the backend's public URL.
- The existing `src/` TypeScript prototype is **reference-only** and will be removed once the
  FastAPI port covers it.

## Why FastAPI (Python) rather than continuing in TypeScript

Considered keeping the TS prototype (it works, and it would let the backend share a
`packages/core` with the Next.js dashboard). Chose Python/FastAPI for team fluency and to keep
room for heavier LLM/data work (transcript processing, embeddings) in Python's ecosystem.

Trade-off accepted: backend and dashboard no longer share code. The cross-language contract
collapses to **the Postgres schema** plus the **`/meetings` HTTP contract**. Strict-JSON
validation moves from the (planned) zod layer to **Pydantic** on the backend; the dashboard
stays read-only against the DB.

## Consequences

Positive:

- Business rules live in testable, reviewable, version-controlled code that honors the 0001
  guardrail (logic out of the orchestrator).
- One fewer hop on the hot path (Twilio → backend, no n8n in between).
- Pydantic gives strict-JSON validation at the type boundary.

Negative / newly owned:

- The backend needs an **always-on public HTTPS host** (Railway / Render / Fly / VPS) plus a
  dev tunnel (ngrok / cloudflared). n8n Cloud previously hosted the webhook URL for us.
- We own **Twilio signature validation**, **retries/error handling**, and **idempotency**
  (ADR 0008) explicitly in code.
- The `/reminders/run` endpoint must be **authenticated** (shared secret) so only the n8n
  scheduler can trigger it.
- Backend and dashboard are now two languages; the DB schema is the binding contract.

## Guardrails

- The backend owns business rules; **Postgres owns durable state**; the dashboard reads
  structured data only (unchanged from 0001).
- n8n holds **no logic** — if a rule starts creeping into the scheduler, it belongs in the
  backend.
- LLM output is validated by Pydantic **before** insertion.
- The reminder endpoint is never publicly callable without the shared secret.
