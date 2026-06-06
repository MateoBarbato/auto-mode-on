# Team Playbook — Halketon Hackathon

Everything the 4-person team needs to ship the full MVP in ~10 hours, co-located.
**Read this page first.** Details live in the linked docs.

- [`roles-and-ownership.md`](roles-and-ownership.md) — who owns what, load balance, the two seams, how we collaborate
- [`git-workflow.md`](git-workflow.md) — branches, PRs, merge rules, integration freeze
- [`testing.md`](testing.md) — TDD approach, the testable-core pattern, tooling, worked examples, per-role guide
- [`timeline-and-checkpoints.md`](timeline-and-checkpoints.md) — hour-by-hour plan, Definition of Done, smoke checklist, demo runbook, cut list

---

## The goal

Ship all three flows end-to-end: **WhatsApp → task → live dashboard**, **reminders + quick-reply status**, and **meeting transcript → tasks**. The floor (must never break) is the WhatsApp→task→dashboard slice.

## The 4 roles (fill in names at kickoff)

Each person owns one substantial, comparable chunk. Silos are soft — we sit together, pair
on seams, and swarm the critical path. Detail in [`roles-and-ownership.md`](roles-and-ownership.md).

| Role | Name | Owns |
|---|---|---|
| **P1 — Capture flow** | _backend person_ | Inbound WhatsApp message → LLM → task → confirmation (the core pipeline, single focus) |
| **P2 — Follow-up loop + Twilio** | _generalist_ | Twilio messaging layer (used by all flows) + reminder engine + status-reply handling |
| **P3 — Dashboard** | _frontend person_ | All dashboard pages on live data + meeting form + demo polish |
| **P4 — Meetings + Data + Integration** | _data person_ | Schema+seeds (first!), prompts, meeting-capture workflow, then integration & demo owner |

## The 3 rules that keep us un-blocked

1. **Contracts are frozen early and shared.** The DB schema, the LLM JSON shapes, and the two seams (intent-routing P1↔P2, meeting-webhook P3↔P4) are the interfaces between people. P4 deploys `schema.sql` + `seeds.sql` in the first 15 minutes so everyone develops against real tables/data.
2. **P3 and P4 never wait.** The dashboard and meeting work run off `seeds.sql` immediately — they don't wait for the live WhatsApp pipeline. P1+P2 share the n8n/Twilio setup, so they **pair** through it.
3. **`main` is always demoable.** Small PRs, a quick peer glance from any teammate, then the author merges — no gatekeeper. Merge every ~2h. P4 owns final integration + the freeze 2h before demo (bugfixes only after that).

## Git in one line

Short-lived branch (`feat/<slice>`) → small PR → any teammate glances → author merges → everyone rebases. Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`). Full detail in [`git-workflow.md`](git-workflow.md).

## Decisions to lock at kickoff (5 min)

- **LLM provider** — pick ONE and standardize (we have all keys). It's a contract, not a per-person choice.
- **Names → roles** — fill the table above.
- **Supabase project + n8n + Twilio sandbox** — confirm all three are reachable and credentials are in a shared, private place (e.g. n8n env vars + a pinned message). Never commit secrets.
- **Demo device** — which phone joins the Twilio WhatsApp sandbox.
