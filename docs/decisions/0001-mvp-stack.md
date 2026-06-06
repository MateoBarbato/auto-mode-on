# ADR 0001 - MVP Stack

## Status

Accepted for hackathon MVP.

## Context

The product must demonstrate value in one day. The core risk is adoption, not technical depth. The system should use the channel NGOs already use and avoid a new operational tool with heavy onboarding.

## Decision

Use:

- Twilio WhatsApp Sandbox for 1:1 WhatsApp intake.
- n8n for orchestration.
- Supabase/Postgres for storage.
- Next.js for the leadership dashboard.
- LLM prompts with strict JSON output for extraction.

## Consequences

Positive:

- Fast setup.
- Clear demo path.
- Low custom backend surface.
- SQL source of truth.
- Easy to swap orchestration later.

Negative:

- Twilio Sandbox does not solve group automation.
- n8n workflows can become messy if business logic grows there.
- Prompt validation must be strict because bad JSON can corrupt the demo flow.

## Guardrails

- n8n orchestrates; it does not own business rules.
- Postgres owns durable state.
- The dashboard reads structured data; it does not parse raw WhatsApp messages.
- LLM output must be validated before insertion.

