# 0003. Equipos y categorías para filtrado del dashboard

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

Con multi-organización y jerarquía de roles (ADR 0002), las ONGs necesitan agrupar
usuarios en **equipos** (estructura operativa) y **categorías** (áreas programáticas).
La dirección quiere filtrar el dashboard por equipo + categoría sin levantar instancias
separadas ni duplicar datos.

Casos de uso:
- Una coordinadora de "Territorio" ve solo tareas de su equipo en "Nutrición".
- Una directora ve todo pero filtra por categoría para reportes a financiadores.
- Un voluntario ve sus tareas asignadas dentro de su equipo y categoría.
- Al invitar un usuario, pre-asignar equipo y categoría.

## Decisión

Agregar dos taxonomías org-scoped independientes:

1. **`teams`** — grupos de trabajo (Coordinación, Territorio, Voluntariado).
2. **`categories`** — áreas programáticas o tipos de trabajo (Nutrición, Educación).

Asignaciones many-to-many:
- Usuarios dashboard: `membership_teams`, `membership_categories`.
- Contactos WhatsApp: `people_teams`, `people_categories`.
- Invitaciones pendientes: `invitation_teams`, `invitation_categories`.

Datos operacionales taggeables:
- `tasks.team_id`, `tasks.category_id` (nullable).
- `meetings.team_id`, `meetings.category_id` (nullable).

Filtrado del dashboard:
- Feature flag `team_category_filters` en `organization_settings.features`.
- Defaults por rol: `default_team_filter` / `default_category_filter` (`all` vs
  `user_teams` / `user_categories`).
- Overrides por miembro: `primary_team_id`, `primary_category_id` en memberships.

Trigger `assert_org_scoped_fk` garantiza que team/category FKs pertenezcan a la
misma organización que la fila padre.

Alternativas descartadas:
- **Una sola tabla `tags` con type** — mezcla conceptos distintos (equipo vs. programa)
  y complica la UI de filtros duales.
- **Solo filtrar por owner, sin tags en tasks** — no permite tareas sin dueño claro ni
  reportes cruzados por programa.
- **Jerarquía anidada team > category** — las ONGs usan ambas dimensiones de forma
  independiente; no forzamos árbol.

## Consecuencias

**Positivas:**
- Filtro combinado equipo + categoría en todo el dashboard.
- Scope `team` en roles ahora tiene semántica concreta (membership_teams).
- Invitaciones pueden pre-configurar equipo/categoría.
- WhatsApp owners heredan tags para auto-clasificación de tareas.

**Negativas:**
- CRUD adicional en settings (equipos, categorías, asignaciones).
- Queries del dashboard más complejas (joins + scope por rol).
- Tareas sin `team_id`/`category_id` quedan fuera de filtros específicos hasta taggear.

**Técnicas:**
- Índice compuesto `tasks(organization_id, team_id, category_id)`.
- Seeds demo con 3 equipos + 3 categorías en Fundación Esperanza.

## Referencias

- [`../architecture/data-model.md`](../architecture/data-model.md) — sección Teams & categories
- [`../../database/schema.sql`](../../database/schema.sql)
- [`../../database/seeds.sql`](../../database/seeds.sql)
- ADR anterior: [`0002-multi-organization-schema.md`](0002-multi-organization-schema.md)

## Notas

- La lógica de filtrado vive en el dashboard (app layer); el schema provee FKs e índices.
- n8n puede copiar tags del `people` al crear tasks desde WhatsApp (convención, no trigger).
