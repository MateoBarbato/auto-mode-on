# Decisiones del Proyecto

Este directorio contiene los Architecture Decision Records (ADRs) del proyecto.

## Índice

| # | Título | Estado | Fecha |
|---|--------|--------|-------|
| [0001](./0001-mvp-stack.md) | MVP Stack (Twilio + n8n + Supabase + Next.js) | Aceptado (orquestación reemplazada por 0010) | 2026-06-06 |
| [0002](./0002-multi-organization-schema.md) | Esquema multi-organización con jerarquía de usuarios | Aceptado | 2026-06-06 |
| [0003](./0003-teams-and-categories.md) | Equipos y categorías para filtrado del dashboard | Aceptado | 2026-06-06 |
| [0004](./0004-projects-and-hierarchy.md) | Proyectos con creación restringida por jerarquía y canal | Aceptado | 2026-06-06 |
| [0005](./0005-llm-project-disambiguation.md) | LLM resuelve proyecto vs individual con disambiguación | Aceptado | 2026-06-06 |
| [0006](./0006-global-organization-tasks.md) | Tareas globales de organización | Aceptado | 2026-06-06 |
| [0007](./0007-whatsapp-org-resolution.md) | Resolución de org en WhatsApp (canal + identidad) | Aceptado | 2026-06-06 |
| [0008](./0008-idempotency.md) | Idempotencia en captura, recordatorios y outreach | Aceptado | 2026-06-06 |
| [0009](./0009-proactive-recurrence-outreach.md) | Bot proactivo y tareas recurrentes | Aceptado | 2026-06-06 |
| [0010](./0010-programmatic-fastapi-pipeline.md) | Pipeline programático en FastAPI (n8n solo como scheduler) | Aceptado (reemplaza la orquestación de 0001) | 2026-06-06 |

## Categorías

- **Arquitectura:** [0001–0010]
- **Tecnología:** [0001, 0010]
- **Datos / Multi-tenant:** [0002, 0003, 0004, 0006, 0007]
- **LLM / WhatsApp:** [0005, 0007, 0008, 0009]
