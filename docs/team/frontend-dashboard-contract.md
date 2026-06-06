# Frontend Dashboard Contract

Contrato de datos y planning para que el frontend implemente KPIs y visualizaciones
sin depender de supuestos fuera del `schema.sql`.

Fuente base:
- [`../../database/schema.sql`](../../database/schema.sql)
- [`../../database/seeds.sql`](../../database/seeds.sql)
- [`../architecture/data-model.md`](../architecture/data-model.md)
- [`roles-and-ownership.md`](roles-and-ownership.md)

## Objetivo

El dashboard debe darle a coordinación una vista simple de:

- Carga operativa: qué hay abierto, vencido, bloqueado o sin responsable.
- Distribución de trabajo: por persona, equipo, categoría, proyecto y prioridad.
- Riesgo de seguimiento: tareas vencidas, próximas a vencer, recordatorios pendientes y baja confianza de extracción.
- Actividad del sistema: capturas por WhatsApp, tareas creadas desde reuniones y uso de recordatorios.

El contrato se basa solo en tablas existentes. Funcionalidades futuras se agregan como
extensiones, no como requisitos implícitos del MVP.

## Estado Actual

La documentación de arquitectura dice que el dashboard objetivo vive en
`apps/dashboard-web/**`, pero este checkout no incluye ese directorio. Por eso este
documento es data-first: sirve para implementar el frontend en el repo donde exista la UI,
o para reconstruir la UI contra Supabase sin acoplarse a mocks.

El dashboard puede desarrollarse contra `database/seeds.sql` desde el día uno.

## Principios

- Toda query debe filtrar por `organization_id`.
- Los filtros de equipo, categoría y proyecto son independientes y combinables.
- Las tareas globales (`is_global = true`) son visibles incluso cuando el scope del usuario es `team` o `assigned`, siempre que `can_view_global_tasks` sea true.
- El frontend no debe mostrar métricas que no se puedan calcular de forma confiable desde el schema actual.
- Los datos sensibles o crudos (`source_text`, `transcript`, `raw_payload`) no deben aparecer en KPIs agregados. Usarlos solo en vistas de detalle con permisos claros.
- Para categorías de muchas opciones, usar barras o tablas. Reservar pie charts para dimensiones chicas y cerradas.

## Feature Flags y Permisos

Leer `organization_settings.features` para prender/apagar módulos:

| Feature | Impacto frontend |
|---|---|
| `calendar_view` | Mostrar calendario o próximos vencimientos |
| `team_load_view` | Mostrar carga por persona/equipo |
| `assigned_tasks_view` | Mostrar vista "Mis tareas" |
| `team_category_filters` | Mostrar filtros `team_id` y `category_id` |
| `project_filters` | Mostrar filtro de proyecto |
| `standalone_tasks` | Mostrar opción "Sin proyecto" |
| `global_tasks` | Mostrar sección/filtro de tareas globales |
| `meeting_memory` | Mostrar sección de reuniones |
| `reminders` | Mostrar KPIs/listas de recordatorios |
| `proactive_outreach` | Mostrar outreach proactivo |
| `task_recurrence` | Mostrar recurrencias |
| `beneficiary_tracking` | Reservado; no hay tablas de beneficiarios todavía |

Leer `organization_settings.role_permissions` + `organization_memberships` para resolver:

| Campo | Uso UI |
|---|---|
| `dashboard_sections` / `dashboard_sections_override` | Navegación visible |
| `tasks_scope` / `tasks_scope_override` | Alcance de datos: `all`, `team`, `assigned` |
| `can_view_global_tasks` | Incluir globales en scopes restringidos |
| `can_create_global_tasks` | Mostrar acción de crear tarea global |
| `default_team_filter` | Filtro inicial |
| `default_category_filter` | Filtro inicial |
| `default_project_filter` | Filtro inicial |

## Filtros Compartidos

Estos filtros deben aplicar igual a cards, gráficos y tablas.

```ts
type DashboardFilters = {
  organizationId: string;
  membershipId: string;
  userId: string;
  dateMode?: "due_date" | "created_at";
  from?: string; // ISO date
  to?: string; // ISO date
  teamId?: string | null;
  categoryId?: string | null;
  projectFilter?: string | "none" | null; // uuid, "none" = standalone, null = all
  globalFilter?: "all" | "global_only" | "exclude_global";
  status?: "pending" | "in_progress" | "blocked" | "done" | "cancelled" | null;
  priority?: "low" | "normal" | "high" | "urgent" | null;
  sourceType?: "whatsapp" | "meeting" | "manual" | null;
  ownerId?: string | null;
};
```

Reglas de scope:

| Scope | Regla |
|---|---|
| `all` | Todas las tareas de la organización |
| `team` | Tareas cuyo `team_id` esté en `membership_teams` |
| `assigned` | Tareas cuyo `owner_id` pertenezca a una `people` vinculada al `user_id` |
| Globales | Incluir `is_global = true` aunque el scope sea `team` o `assigned`, si el rol lo permite |

## Definiciones de Tareas

| Concepto | Definición |
|---|---|
| Tarea abierta | `status in ('pending', 'in_progress', 'blocked')` |
| Tarea cerrada | `status in ('done', 'cancelled')` |
| Vencida | abierta y `due_date < current_date` |
| Vence hoy | abierta y `due_date = current_date` |
| Vence esta semana | abierta y `due_date between current_date and current_date + interval '7 days'` |
| Sin fecha | abierta y `due_date is null` |
| Sin responsable | `owner_id is null` y `owner_name is null` o vacío |
| Responsable no vinculado | `owner_id is null` pero `owner_name` existe |
| Alta prioridad | `priority in ('high', 'urgent')` |
| Baja confianza | `confidence is not null and confidence < 0.75` |
| Global | `is_global = true` y `project_id is null` |
| Standalone | `project_id is null and is_global = false` |
| De proyecto | `project_id is not null and is_global = false` |

## Layout Sugerido

Prioridad visual para la primera pantalla:

| Zona | Contenido | Prioridad |
|---|---|---|
| Header | Organización activa, filtros globales, rango temporal | Must |
| KPI rail | Abiertas, vencidas, vencen esta semana, bloqueadas, sin responsable | Must |
| Riesgo operativo | Histograma de vencimientos + lista de vencidas/próximas | Must |
| Carga de equipo | Bar chart por responsable + tabla de bloqueadas | Must si `team_load_view` |
| Distribución | Pie charts por estado, prioridad y origen | Should |
| Proyectos | Progreso por proyecto y tareas standalone/global separadas | Should si `projects` |
| Reuniones | Reuniones recientes y tareas creadas desde meeting | Later si `meeting_memory` no está conectado |
| Reminders | Recordatorios pendientes/enviados | Later si `reminders` no está conectado |

El primer demo no necesita todas las rutas. Puede ser una sola pantalla con drill-downs
simples a una tabla filtrada de tareas.

## KPIs MVP

Cards recomendadas para el header del dashboard.

| KPI | Formula | Tabla/campos | Acción sugerida |
|---|---|---|---|
| Tareas abiertas | Count de tareas abiertas | `tasks.status` | Link a `/tasks?status=open` |
| Vencidas | Count de abiertas con `due_date < today` | `tasks.due_date`, `tasks.status` | Ordenar por fecha ascendente |
| Vencen esta semana | Count de abiertas con `due_date` próximos 7 días | `tasks.due_date` | Mostrar agenda inmediata |
| Bloqueadas | Count `status = 'blocked'` | `tasks.status` | Revisar obstáculos |
| Sin responsable | Count sin `owner_id` ni `owner_name` | `tasks.owner_id`, `tasks.owner_name` | Asignar owner |
| Responsable no vinculado | Count con `owner_name` pero sin `owner_id` | `tasks.owner_id`, `tasks.owner_name` | Vincular a `people` |
| Alta prioridad abierta | Count abiertas con `high`/`urgent` | `tasks.priority` | Priorización |
| Tareas globales abiertas | Count abiertas con `is_global = true` | `tasks.is_global` | Sección global tasks |
| Proyectos activos | Count `projects.status in ('planning','active')` | `projects.status` | Link a proyectos |
| Reuniones registradas | Count de `meetings` en rango | `meetings.created_at` | Link a reuniones |
| Recordatorios pendientes | Count `reminders.sent_at is null and scheduled_at <= now()` | `reminders` | Ejecutar/supervisar workflow |
| Capturas WhatsApp | Count de `inbound_messages` en rango | `inbound_messages.received_at` | Salud del intake |

KPIs opcionales:

| KPI | Formula | Nota |
|---|---|---|
| Tasa de cierre simple | `done / total` en el rango | No representa velocidad porque no hay `completed_at` |
| Confianza promedio LLM | Avg de `tasks.confidence` no null | Solo para tareas extraídas |
| Tareas desde reuniones | Count `tasks.source_type = 'meeting'` | Requiere meeting flow |
| Tareas desde WhatsApp | Count `tasks.source_type = 'whatsapp'` | Requiere capture flow |

## Visualizaciones MVP

### Histograma: vencimientos por bucket

Objetivo: mostrar riesgo operativo inmediato.

Buckets:

| Bucket | Regla |
|---|---|
| Vencidas | abierta y `due_date < current_date` |
| Hoy | abierta y `due_date = current_date` |
| 1-7 días | abierta y `due_date between current_date + 1 and current_date + 7` |
| 8-30 días | abierta y `due_date between current_date + 8 and current_date + 30` |
| Sin fecha | abierta y `due_date is null` |

Tipo visual: histogram/bar chart. No usar pie chart porque el orden temporal importa.

### Line chart: tareas creadas por día

Objetivo: entender volumen de entrada.

Serie:

```sql
date_trunc('day', created_at) as day,
count(*) as tasks_created
```

Tabla: `tasks`.

Filtro recomendado: últimos 7, 14 o 30 días. Aplicar `source_type` si se quiere separar
WhatsApp, reunión y manual.

### Line chart: mensajes recibidos por día

Objetivo: monitorear uso del canal WhatsApp.

Serie:

```sql
date_trunc('day', received_at) as day,
count(*) as inbound_messages
```

Tabla: `inbound_messages`.

### Pie chart: distribución por estado

Objetivo: foto rápida del backlog.

Dimensión: `tasks.status`.

Segmentos esperados: `pending`, `in_progress`, `blocked`, `done`, `cancelled`.

Usar pie chart solo si hay cinco segmentos o menos. Si se agrega histórico de estados,
mantener esta visual como snapshot actual.

### Pie chart: distribución por prioridad

Objetivo: ver concentración de urgencias.

Dimensión: `tasks.priority`.

Segmentos: `low`, `normal`, `high`, `urgent`.

### Pie chart: origen de tareas

Objetivo: mostrar valor de WhatsApp/reuniones frente a carga manual.

Dimensión: `tasks.source_type`.

Segmentos: `whatsapp`, `meeting`, `manual`, `unknown`.

### Bar chart: carga por responsable

Objetivo: detectar sobrecarga.

Agrupación:

```sql
coalesce(p.display_name, tasks.owner_name, 'Sin responsable') as owner_label,
count(*) filter (where status in ('pending', 'in_progress', 'blocked')) as open_tasks,
count(*) filter (where status = 'blocked') as blocked_tasks,
count(*) filter (where due_date < current_date and status in ('pending', 'in_progress', 'blocked')) as overdue_tasks
```

Tablas: `tasks` left join `people p on p.id = tasks.owner_id`.

No usar pie chart para owners: puede haber demasiadas personas y no hay orden natural.

### Stacked bar: tareas por equipo y estado

Objetivo: comparar equipos sin perder estado.

Agrupación: `teams.name` x `tasks.status`.

Tablas: `tasks` left join `teams`.

Requiere feature `team_load_view`.

### Stacked bar: tareas por categoría y estado

Objetivo: ver carga por área programática.

Agrupación: `categories.name` x `tasks.status`.

Tablas: `tasks` left join `categories`.

Requiere feature `team_category_filters`.

### Project progress: estado por proyecto

Objetivo: identificar proyectos trabados.

Agrupación: `projects.name` x `tasks.status`.

Tabla base: `projects` left join `tasks`.

Mostrar también tareas standalone/global fuera de esta visual para no mezclar alcances.

## Tablas y Listas Operativas

| Lista | Orden | Campos mínimos |
|---|---|---|
| Vencidas | `due_date asc`, `priority desc` | título, owner, due date, proyecto, prioridad |
| Próximas | `due_date asc` | título, owner, fecha, estado |
| Bloqueadas | `updated_at desc` | título, owner, proyecto, última actualización |
| Sin responsable | `created_at desc` | título, `owner_name`, source, confidence |
| Baja confianza | `confidence asc` | título, source_text resumido, confidence |
| Recordatorios pendientes | `scheduled_at asc` | tarea, owner, scheduled_at |
| Reuniones recientes | `created_at desc` | title, summary, tareas vinculadas |

## Contrato de Datos Agregados

Si el frontend agrega en cliente, devolver objetos con esta forma. Si el backend luego
expone vistas/RPC/endpoints, mantener la misma forma.

```ts
type DashboardSummary = {
  kpis: {
    openTasks: number;
    overdueTasks: number;
    dueThisWeekTasks: number;
    blockedTasks: number;
    unownedTasks: number;
    unresolvedOwnerTasks: number;
    highPriorityOpenTasks: number;
    openGlobalTasks: number;
    activeProjects: number;
    meetingsInRange: number;
    pendingReminders: number;
    inboundMessagesInRange: number;
  };
  charts: {
    dueDateBuckets: Array<{ bucket: string; count: number }>;
    tasksCreatedByDay: Array<{ day: string; count: number }>;
    inboundMessagesByDay: Array<{ day: string; count: number }>;
    tasksByStatus: Array<{ status: string; count: number }>;
    tasksByPriority: Array<{ priority: string; count: number }>;
    tasksBySource: Array<{ sourceType: string; count: number }>;
    workloadByOwner: Array<{
      ownerId: string | null;
      ownerLabel: string;
      openTasks: number;
      overdueTasks: number;
      blockedTasks: number;
    }>;
  };
};
```

## Queries Base de Referencia

### Tareas visibles

Usar la query documentada en
[`../architecture/data-model.md`](../architecture/data-model.md#dashboard-filtering-proyecto-categoría-equipo)
como base para aplicar proyecto, globales, categoría, equipo y scope por rol.

El frontend debe tratar esa query como contrato lógico aunque inicialmente la replique
con Supabase query builder.

### KPI: abiertas/vencidas/semana

```sql
select
  count(*) filter (
    where status in ('pending', 'in_progress', 'blocked')
  ) as open_tasks,
  count(*) filter (
    where status in ('pending', 'in_progress', 'blocked')
      and due_date < current_date
  ) as overdue_tasks,
  count(*) filter (
    where status in ('pending', 'in_progress', 'blocked')
      and due_date between current_date and current_date + interval '7 days'
  ) as due_this_week_tasks
from tasks
where organization_id = :organization_id;
```

### Histograma de vencimientos

```sql
select bucket, count(*) from (
  select case
    when due_date is null then 'sin_fecha'
    when due_date < current_date then 'vencidas'
    when due_date = current_date then 'hoy'
    when due_date <= current_date + interval '7 days' then '1_7_dias'
    when due_date <= current_date + interval '30 days' then '8_30_dias'
    else 'mas_30_dias'
  end as bucket
  from tasks
  where organization_id = :organization_id
    and status in ('pending', 'in_progress', 'blocked')
) buckets
group by bucket;
```

### Carga por responsable

```sql
select
  t.owner_id,
  coalesce(p.display_name, t.owner_name, 'Sin responsable') as owner_label,
  count(*) filter (where t.status in ('pending', 'in_progress', 'blocked')) as open_tasks,
  count(*) filter (
    where t.status in ('pending', 'in_progress', 'blocked')
      and t.due_date < current_date
  ) as overdue_tasks,
  count(*) filter (where t.status = 'blocked') as blocked_tasks
from tasks t
left join people p on p.id = t.owner_id
where t.organization_id = :organization_id
group by t.owner_id, owner_label
order by open_tasks desc, overdue_tasks desc;
```

## Lo Que No Podemos Medir Bien Todavía

| Métrica deseada | Motivo | Cambio futuro necesario |
|---|---|---|
| Tiempo real de cierre | No hay `completed_at` ni historial de estado | Agregar `completed_at` o `task_status_events` |
| Tendencia de tareas completadas por día confiable | `updated_at` cambia por cualquier edición | Agregar evento de cambio a `done` |
| SLA por responsable/equipo | No hay baseline ni fecha de cierre | Agregar historial y reglas SLA |
| Reaperturas | No hay historial de transición de estado | Agregar `task_status_events` |
| Impacto/beneficiarios | Solo existe feature flag `beneficiary_tracking` | Agregar tablas específicas de beneficiarios/actividades/resultados |
| Productividad por horas | No hay estimaciones ni tiempo trabajado | Agregar esfuerzo estimado/real si el producto lo necesita |
| Calidad de extracción por corrección humana | No hay tabla de correcciones | Agregar audit/correction log |

## Planning por Fases

### Fase 0: contrato visual con seeds

Entregable frontend:

- Layout de dashboard con cards KPI.
- Placeholders de histogram, line chart, pie chart y tablas operativas.
- Datos tomados de `seeds.sql` o mock generado con la misma forma del contrato.

No requiere backend adicional.

### Fase 1: Supabase live reads

Entregable frontend:

- Reemplazar mocks por queries a `tasks`, `projects`, `people`, `teams`, `categories`, `meetings`, `reminders`, `inbound_messages`.
- Aplicar filtros compartidos a todos los widgets.
- Resolver permisos desde `organization_settings` y `organization_memberships`.

Requiere Supabase con `schema.sql` + `seeds.sql` desplegados.

### Fase 2: agregados backend/RPC

Entregable backend:

- Vista o RPC `dashboard_summary_v1(filters)` que devuelva `DashboardSummary`.
- Vista o RPC `visible_tasks_v1(filters)` que centralice scope por rol.
- Índices adicionales solo si aparecen problemas reales de performance.

Motivo: evitar duplicar lógica compleja de permisos y filtros en cada pantalla.

### Fase 3: métricas avanzadas

Requiere cambios de schema:

- `task_status_events` para histórico de estados.
- `completed_at` en `tasks` o evento derivado.
- Tablas de beneficiarios/actividades/resultados si se activa Track 3.
- Preferencias por usuario para notificaciones y opt-out de outreach.

## Acceptance Criteria para Frontend

- Cada KPI tiene definición documentada y fuente de datos trazable al schema.
- Todos los widgets respetan `organization_id`, scope por rol y filtros activos.
- Empty states distinguen "no hay datos" de "feature apagada".
- Loading/error states existen para cada bloque.
- No hay métrica de tiempo de cierre, SLA o impacto hasta que exista soporte backend.
- Pie charts solo se usan para estado, prioridad, source o scope; no para owners/equipos largos.
- La vista de tareas permite saltar desde cada KPI/gráfico al listado filtrado correspondiente.
- El demo mínimo muestra: abiertas, vencidas, carga por persona, vencimientos próximos y distribución por estado.

## Preguntas Pendientes

- ¿El frontend consumirá Supabase directo o un endpoint propio del backend?
- ¿La autenticación ya entrega `organization_id`, `membership_id` y `user_id`, o el frontend debe resolverlos al iniciar sesión?
- ¿El dashboard será una sola página o habrá rutas separadas para tareas, proyectos, reuniones y settings?
- ¿Qué librería de charts va a usar el compañero frontend?
- ¿Queremos modo demo hardcodeado por `fundacion-esperanza` mientras se termina auth?
