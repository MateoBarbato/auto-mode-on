# Hackathon Kickoff Plan — Start Here

One page. Find your number, do the work in order, check the box when smoke-passes.
Full detail lives in [`roles-and-ownership.md`](roles-and-ownership.md) and
[`timeline-and-checkpoints.md`](timeline-and-checkpoints.md) — this is the cheat sheet.

## What's already done (don't rebuild it)

- ✅ DB schema + seeds (`database/`)
- ✅ Prompt templates (`prompts/`)
- ✅ Dashboard UI on mock data (`apps/dashboard-web/`)

**The whole job today = wire the live pipeline.** WhatsApp → n8n → LLM → Supabase → dashboard.

---

## First 30 min — everyone, together

1. Names → P1/P2/P3/P4 (below).
2. LLM provider = **OpenAI** — put `OPENAI_API_KEY` in n8n (pick a fast model; both prompts are provider-agnostic strict-JSON).
3. Confirm Supabase, n8n, Twilio sandbox all reachable; demo phone joins the sandbox.
4. Lock the **two seam contracts** out loud:
   - **Intent seam (P1↔P2):** inbound webhook reads `intent`; `task_creation`→P1, `status_update`→P2.
   - **Meeting seam (P3↔P4):** `POST {transcript}` → `{ summary, tasks[] }`.
5. Create 4 branches: `p1-capture`, `p2-reminders`, `p3-dashboard`, `p4-meetings`.

**P4 goes first:** deploy `schema.sql` + `seeds.sql` to Supabase, say "tables live." That unblocks everyone.

---

## P1 — Capture flow  *(owns `task-capture.workflow.json`)*

The critical path. WhatsApp message → structured task.

1. (Pair with P2) Get the Twilio webhook firing into n8n; one raw message lands in `inbound_messages`.
2. Call the LLM with `prompts/task-extraction.md`; **validate the strict JSON** before using it.
3. Branch on `intent`:
   - `task_creation` → insert into `tasks` (set `source_message_id`, `owner_name`, `due_date`, `priority`, `confidence`).
   - `status_update` → hand to P2.
4. Send a WhatsApp confirmation reply ("Registre: … Confirmas?").

**Done when:** a real WhatsApp message creates a `tasks` row and the sender gets a reply.

## P2 — Twilio layer + reminders + status replies  *(owns `reminder-engine.workflow.json`)*

Owns all WhatsApp send/receive plumbing + the follow-up loop.

1. **Twilio layer:** configure sandbox, build the reusable outbound-send node + inbound webhook (P1 uses these too — build once, well).
2. **reminder-engine:** scheduled fetch of due tasks → send reminder → record in `reminders`. **Dedup:** skip tasks already reminded (`reminders.sent_at`).
3. **Status replies:** inbound `done`/`in_progress`/`blocked` → update the task `status` + the reminder's `response`. (Other half of the intent seam.)

**Done when:** Twilio send works, a due task fires exactly one reminder, and replying `done` flips the task on the dashboard.

## P3 — Dashboard  *(owns `apps/dashboard-web/**`)*

The face of the demo. Never blocked — develop against `seeds.sql` from minute one.

1. Swap `lib/mock-data.ts` for **live Supabase reads** on `/dashboard` and `/tasks`. Keep the existing `getDashboardSummary` logic — just feed it real rows.
2. Build the `/meetings` list + the **meeting input form** that POSTs a transcript to P4's webhook and renders `{ summary, tasks[] }`.
3. Polish: empty states, loading, styling. It's what the judges see.

**Done when:** `/dashboard` + `/tasks` show live data (open / overdue / load-by-person / this-week), no mock import left.

## P4 — Data + prompts + meeting flow + integration  *(owns `database/**`, `prompts/**`, `meeting-capture.workflow.json`)*

Front-loaded foundation, then becomes integration/demo owner.

1. **First 15 min:** deploy schema + seeds → "tables live."
2. **meeting-capture workflow:** webhook `{transcript}` → run `prompts/meeting-summary.md` → insert `meetings` + `tasks` + `meeting_tasks` → return `{summary, tasks[]}`.
3. **Tune both prompts** — extraction quality is everyone's shared dependency.
4. **Back half of day — integration owner:** keep `main` healthy, run the smoke checklist before each checkpoint, own demo data, tag `demo-freeze`.

**Done when:** pasting a transcript creates a meeting + multiple linked tasks visible on the dashboard.

---

## Checkpoints

- **H+4h — "the floor works":** real WhatsApp message → task → live dashboard. If broken, **everyone swarms P1's capture flow.**
- **H+7h — "all three flows demoable":** honest status; cut anything not working.
- **H+8h — freeze:** `main` is bugfix-only; load realistic demo data; rehearse twice; keep a 1h buffer.

## If behind, cut from the bottom (never the top)

1. Reminder dedup → 2. Inbound status-via-reply → 3. Meeting extraction → 4. Confirmation reply.

**Never cut:** WhatsApp message → task → visible on live dashboard. That's the MVP and the demo.

## Rules of the room

- Pair on the two seams; agree the JSON, then split.
- Finished your slice? **Swarm the critical path** (usually capture). Early ≠ done.
- Changing schema or a prompt? Say it out loud first — others build on it.
