# Halketon Documentation

WhatsApp-first **operational memory** for NGO teams — capture commitments from everyday
WhatsApp messages and meetings, structure them with an LLM, and give leadership a simple
view of load, deadlines, and follow-up risk.

> New here? Read in this order: **Product** → **Architecture** → **Flows**.

## Map

```mermaid
flowchart TD
  R["README (root)"] --> P
  R --> A
  subgraph P[Product — why]
    P1["mvp-definition.md"]
    P2["hackathon-brief.md"]
    P3["working-notes.md"]
  end
  subgraph A[Architecture — how]
    A1["overview.md"]
    A2["data-model.md"]
    A3["diagrams/flows.md"]
    A4["decisions/0001-mvp-stack.md"]
  end
```

## Contents

### Product (the *why*)
- [`product/mvp-definition.md`](product/mvp-definition.md) — thesis, users, hero use case, features, non-goals, demo script.
- [`product/hackathon-brief.md`](product/hackathon-brief.md) — the official Halketon challenge brief (3 tracks, drawn from 16 NGO interviews).
- [`product/working-notes.md`](product/working-notes.md) — team strategy & brainstorm (track choice, adoption principles, scope).

### Architecture (the *how*)
- [`architecture/overview.md`](architecture/overview.md) — **start here.** Context, container, deployment & implementation-status diagrams; component responsibilities; tech stack; env vars.
- [`architecture/data-model.md`](architecture/data-model.md) — ERD, table reference, enums, conventions.
- [`diagrams/flows.md`](diagrams/flows.md) — runtime sequence diagrams (task capture, meeting extraction, reminders).

### Team / Process (the *how we work*)
- [`team/README.md`](team/README.md) — **hackathon playbook.** Roles, the 3 un-blocking rules, kickoff decisions.
- [`team/roles-and-ownership.md`](team/roles-and-ownership.md) — vertical slices, file-ownership map, shared contracts.
- [`team/git-workflow.md`](team/git-workflow.md) — branches, PRs, merge rules, integration freeze.
- [`team/testing.md`](team/testing.md) — TDD approach, what is/isn't testable here, tooling, worked examples, per-role guide.
- [`team/timeline-and-checkpoints.md`](team/timeline-and-checkpoints.md) — hour-by-hour plan, Definition of Done, smoke checklist, demo runbook, cut list.

### Decisions
- [`decisions/0001-mvp-stack.md`](decisions/0001-mvp-stack.md) — ADR: why Twilio + n8n + Supabase + Next.js.

### Reference
- [`reference/`](reference/) — source PDF (base architecture & product definition).

## Related artifacts (outside `docs/`)
- [`../database/schema.sql`](../database/schema.sql) · [`../database/seeds.sql`](../database/seeds.sql) — Postgres schema & demo data.
- [`../prompts/`](../prompts/) — strict-JSON extraction prompts.
- [`../apps/n8n-workflows/`](../apps/n8n-workflows/) — importable workflow definitions.
- [`../apps/dashboard-web/`](../apps/dashboard-web/) — Next.js leadership dashboard.

## Current status at a glance

| Layer | State |
|---|---|
| DB schema + seeds | ✅ Complete |
| Prompt templates | ✅ Complete |
| Dashboard UI (mock data) | ✅ Complete |
| n8n task-capture / reminders | 🟡 Scaffolded (stubs) |
| Live Supabase reads / meeting flow | 🔴 Not started |

Full breakdown in [`architecture/overview.md` §8](architecture/overview.md#8-implementation-status-target-vs-today).
