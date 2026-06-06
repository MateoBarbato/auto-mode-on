# 0004. Proyectos con creación restringida por jerarquía y canal

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

Las ONGs organizan trabajo en iniciativas con plazo e impacto medible (informe a
financiador, ciclo de talleres). Las tareas sueltas no alcanzan para esa vista.
Se necesita:

- Agrupar tareas bajo **proyectos**.
- Crear proyectos desde el **dashboard** o el **bot de WhatsApp**.
- Restringir quién puede crear según **rol** (jerarquía ADR 0002).

Los miembros (`member`) crean tareas pero no deberían abrir proyectos nuevos sin
coordinación. Managers y arriba sí, desde ambos canales.

## Decisión

Agregar tabla **`projects`** org-scoped con:

- Tag opcional `team_id` (reutiliza taxonomía ADR 0003).
- **Múltiples categorías** vía `project_categories` (M2M; una `is_primary`).
- Estado `project_status` y auditoría de canal (`created_via`: dashboard / whatsapp / meeting).
- FK `created_by_user_id` o `created_by_people_id` según canal (CHECK en DDL).

Las **tareas** y **reuniones** ganan `project_id` **opcional**. La mayoría de capturas
WhatsApp son standalone (`project_id = NULL`). Trigger `inherit_task_project_tags` solo
actúa cuando hay proyecto. Filtrado: incluye opción **“Sin proyecto”** en el dashboard.

**Autorización en `role_permissions`** (app/n8n, no RLS aún):

| Rol | Crear | Dashboard | WhatsApp | Gestionar (edit/archivar) |
|---|---|---|---|---|
| owner, admin | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ |
| member | ❌ | ❌ | ❌ | ❌ |

Flags: `can_create_projects`, `can_create_projects_via_dashboard`,
`can_create_projects_via_whatsapp`, `can_manage_projects`.

Override por miembro: `can_create_projects_override` en `organization_memberships`.

Feature flag: `features.projects`.

Alternativas descartadas:
- **Proyecto = categoría** — mezcla contenedor temporal con área programática.
- **RLS en Postgres para creación** — la jerarquía depende del canal (WhatsApp vs UI);
  validación en n8n/dashboard es más clara para el hackathon.
- **Tabla `project_permissions` separada** — duplica lo ya modelado en role_permissions JSONB.

## Consecuencias

**Positivas:**
- Vista agregada por proyecto en el dashboard.
- Bot puede crear proyectos solo para remitentes con rol suficiente.
- Tareas heredan team/category del proyecto solo cuando `project_id` está seteado.
- Standalone tasks son el caso común en WhatsApp; no forzar proyecto en insert.

**Negativas:**
- n8n debe resolver people → user → membership antes de crear vía WhatsApp.
- Voluntarios sin cuenta dashboard no pueden crear proyectos por WhatsApp aunque coordinen
  (necesitan `people.user_id` vinculado o rol vía número autorizado en app layer).

**Técnicas:**
- Enums `project_status`, `project_channel`.
- Índice `tasks(organization_id, project_id)`.
- Seeds: proyecto creado por directora (dashboard) y por coordinador (whatsapp).

## Referencias

- [`../architecture/data-model.md`](../architecture/data-model.md) — sección Projects
- [`../../database/schema.sql`](../../database/schema.sql)
- [`../../database/seeds.sql`](../../database/seeds.sql)
- ADRs: [`0002-multi-organization-schema.md`](0002-multi-organization-schema.md),
  [`0003-teams-and-categories.md`](0003-teams-and-categories.md)

## Notas

- Intent `project_creation` en el LLM/prompts es trabajo de n8n, fuera del DDL.
- `created_via = meeting` reserva creación desde extracción de actas (sin actor obligatorio aún).
- Proyectos multi-categoría: ver `project_categories`; filtro combinado documentado en
  [`data-model.md`](../architecture/data-model.md#dashboard-filtering-proyecto-categoría-equipo).
