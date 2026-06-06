# 0005. LLM resuelve proyecto vs tarea individual con disambiguación

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

Las tareas pueden ser standalone o pertenecer a un proyecto (ADR 0004). Por WhatsApp,
el usuario no siempre nombra el proyecto. Forzar `project_id` al insertar es incorrecto;
ignorar proyectos pierde contexto operativo.

Se necesita que el **LLM consumidor** (task-extraction):
1. Intente matchear contra proyectos activos de la org.
2. Clasifique standalone cuando corresponda.
3. Si no hay confianza, **pregunte** al usuario antes de persistir.

## Decisión

Extender el contrato strict-JSON de extracción con `project_resolution`:

- `matched` → insert inmediato con `project_id`
- `standalone` → insert inmediato sin proyecto
- `needs_clarification` → no insert; mensaje con opción `0` (individual) + lista numerada de proyectos

Segundo turno vía [`project-assignment-reply.md`](../../prompts/project-assignment-reply.md).

Persistencia multi-turno: tabla **`task_drafts`** (`awaiting_project_choice`, expira 24h).

n8n siempre pasa `active_projects` (status `planning` | `active`) al prompt.

Alternativas descartadas:
- **Solo reglas keyword** — frágil en lenguaje natural NGO.
- **Insertar siempre standalone y corregir después** — pierde valor del dashboard por proyecto.
- **Preguntar siempre** — fricción innecesaria cuando el mensaje es explícito.

## Consecuencias

**Positivas:**
- UX conversacional alineada con WhatsApp.
- Proyectos se enriquecen sin obligar al usuario a recordar slugs.
- Standalone sigue siendo el default explícito (opción 0).

**Negativas:**
- Dos llamadas LLM en el peor caso (extracción + reply).
- n8n debe detectar replies pendientes (`task_drafts` por `sender_phone`).
- Lista de proyectos larga puede requerir paginación futura.

**Técnicas:**
- Prompts: `prompts/task-extraction.md`, `prompts/project-assignment-reply.md`
- Flujo: `docs/diagrams/flows.md` §1b

## Referencias

- [`../architecture/data-model.md`](../architecture/data-model.md)
- [`../../database/schema.sql`](../../database/schema.sql) — `task_drafts`
- ADR: [`0004-projects-and-hierarchy.md`](0004-projects-and-hierarchy.md)

## Notas

- Respuestas numéricas (`0`, `1`, `2`) pueden resolverse sin LLM en n8n como fast path.
- Dashboard / reuniones pueden reutilizar la misma lógica de `project_resolution` en UI.
