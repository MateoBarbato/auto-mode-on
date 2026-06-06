# 0006. Tareas globales de organización

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

Además de tareas en proyectos y tareas standalone (ADR 0004–0005), las ONGs tienen
compromisos que **reflejan a toda la organización**: personería jurídica, auditorías,
obligaciones estatutarias, campañas institucionales. No son de un proyecto operativo ni
son trámites individuales de un voluntario.

Deben ser visibles para todos en el dashboard y distinguibles en filtros y extracción LLM.

## Decisión

Agregar **`tasks.is_global boolean default false`** con constraint
`(NOT is_global OR project_id IS NULL)`.

Tres niveles de alcance de tarea:

| Nivel | `is_global` | `project_id` | Ejemplo |
|---|---|---|---|
| Global | `true` | `NULL` | Renovar personería jurídica |
| Proyecto | `false` | UUID | Informe financiador Q2 |
| Standalone | `false` | `NULL` | Renovar certificado SSL |

Permisos en `role_permissions`:
- `can_view_global_tasks` — todos los roles (`true`)
- `can_create_global_tasks` — solo `owner`, `admin`

Dashboard: sección `global_tasks`; filtro `global_filter` (`all` | `global_only` | `exclude_global`).

LLM: detecta `is_global` **antes** de resolución de proyecto; disambiguación incluye opción `G`.

Queries con scope restringido (`assigned`, `team`) **siempre incluyen** `is_global = true`.

## Consecuencias

**Positivas:**
- Dirección ve compromisos institucionales sin mezclarlos con proyectos.
- Voluntarios ven contexto org-wide relevante.
- Modelo de tres niveles claro para n8n y dashboard.

**Negativas:**
- Una dimensión más en filtros y prompts.
- Creación global restringida puede frustrar managers por WhatsApp (by design).

## Referencias

- [`../architecture/data-model.md`](../architecture/data-model.md)
- [`../../database/schema.sql`](../../database/schema.sql)
- [`../../prompts/task-extraction.md`](../../prompts/task-extraction.md)
- ADR: [`0004-projects-and-hierarchy.md`](0004-projects-and-hierarchy.md),
  [`0005-llm-project-disambiguation.md`](0005-llm-project-disambiguation.md)

## Notas

- `standalone_tasks` filter excluye globales (`NOT is_global`) para no confundir con "sin proyecto".
- Globales pueden llevar `category_id` (ej. Administración) pero no `team_id` obligatorio.
