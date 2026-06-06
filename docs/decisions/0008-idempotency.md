# 0008. Idempotencia en captura, recordatorios y outreach proactivo

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

WhatsApp y n8n son **at-least-once**: Twilio puede reintentar webhooks, el scheduler puede
correr dos veces, el usuario puede tocar dos veces. Sin idempotencia aparecen:

- Tareas duplicadas por el mismo mensaje
- Recordatorios repetidos
- Mensajes proactivos duplicados al detectar recurrencias

**Las tareas fantasma** (compromisos no formalizados en chat) son un feature **distinto**:
detectan *nuevas* oportunidades de captura. No aportan idempotencia; **la necesitan más**
para no sugerir dos veces lo mismo.

## Decisión

Claves de idempotencia explícitas en tablas de efecto + constraints UNIQUE:

| Flujo | Clave | Constraint |
|---|---|---|
| Inbound WhatsApp | `Twilio MessageSid` | `inbound_messages (org, provider, provider_message_id)` |
| Task desde mensaje | `task:msg:{inbound_id}` | `tasks (org, idempotency_key)` |
| Task desde draft | `task:draft:{draft_id}` | idem |
| Draft proyecto pendiente | `(org, sender_phone)` | `task_drafts` partial unique |
| Reminder enviado | `reminder:send:{reminder_id}` | `reminders.idempotency_key` UNIQUE |
| Ocurrencia recurrente | `recurrence:{id}:{YYYY-MM-DD}` | `recurrence_occurrences` |
| Outreach proactivo | `outreach:{type}:{...}` | `proactive_outreach (org, idempotency_key)` |

Patrón n8n: **INSERT … ON CONFLICT DO NOTHING** (o catch unique violation) → skip send.

Alternativas descartadas:
- **Confiar solo en `sent_at`** — race entre workers duplica envíos.
- **Deduplicar en memoria n8n** — se pierde al reiniciar workflow.
- **Omitir fantasmas para “evitar duplicados”** — no relacionado; fantasmas requieren keys propias (`ghost:msg:{id}`) cuando existan.

## Consecuencias

**Positivas:**
- Re-runs seguros del reminder engine y del bot proactivo.
- Base lista para recurrencias sin miedo a spam.
- Fantasmas (futuro) encajan con el mismo patrón.

**Negativas:**
- n8n debe generar keys determinísticas.
- Un mensaje con **varias** tareas usa sufijos (`task:msg:{id}:2`).

## Referencias

- [`../architecture/data-model.md`](../architecture/data-model.md)
- [`../../database/schema.sql`](../../database/schema.sql)
- ADR: [`0009-proactive-recurrence-outreach.md`](0009-proactive-recurrence-outreach.md)

## Notas

- `provider_message_id` en inbound **no debe ser null** en producción (MessageSid obligatorio).
- Twilio outbound: guardar `twilio_message_sid` en `reminders` y `proactive_outreach`.
