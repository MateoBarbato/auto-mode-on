# 0009. Bot proactivo y tareas recurrentes

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

El bot no debe ser solo reactivo. Las ONGs tienen ciclos repetidos (informes, talleres,
trámites). Queremos que el sistema **hable primero**: sugerir recurrencias, recordar
instancias, anticipar necesidades.

Debe convivir con idempotencia (ADR 0008) para no spamear.

## Decisión

Tres piezas nuevas:

1. **`task_recurrences`** — plantilla (intervalo, owner, proyecto, global/standalone).
2. **`recurrence_occurrences`** — cada fecha concreta; UNIQUE por `(recurrence_id, occurrence_on)`.
3. **`proactive_outreach`** — cola de mensajes salientes WhatsApp con `idempotency_key`.

Flujos proactivos (n8n scheduler):

- **Sugerir recurrencia** — tras N tareas similares → outreach `recurrence_suggestion` → usuario confirma → `status = active`.
- **Instancia próxima** — `recurrence_instance` T-7 / T-3 / T-0 → crear occurrence + opcional task con key idempotente.
- **Recordatorios enriquecidos** — siguen en `reminders` + ADR 0008.

Feature flags: `proactive_outreach`, `task_recurrence`.

Opt-out por persona vía `users.email_notifications_enabled` / preferencias futuras.

**Fuera de scope inicial:** detección de tareas fantasma (requiere ADR propio + keys `ghost:*`).

## Consecuencias

**Positivas:**
- Memoria operativa que empuja, no solo archiva.
- Recurrencias explícitas vs inferidas solo por LLM.

**Negativas:**
- Scheduler y templates de mensaje en n8n.
- Tuning de frecuencia para no saturar voluntarios.

## Referencias

- [`../../prompts/whatsapp-org-resolution.md`](../../prompts/whatsapp-org-resolution.md) — outbound usa mismo canal org
- [`0008-idempotency.md`](0008-idempotency.md)

## Notas

- Mensajes proactivos salen por `organization_channels` de la org del `people`.
- Confirmación siempre: “1 — Crear tarea · 0 — Posponer · N — No recordar más”.
