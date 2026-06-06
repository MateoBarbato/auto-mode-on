import type {
  Organization,
  Team,
  Category,
  User,
  Membership,
  Project,
  Task,
  Meeting,
  Reminder,
  InboundMessage,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Mock dataset for a single nonprofit organization ("Fundación Halketon").
// Shapes mirror the SQL schema so this can be swapped for live Supabase data.
// ---------------------------------------------------------------------------

const today = new Date("2026-06-06T12:00:00Z")
function dayOffset(days: number): string {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}
function dateOffset(days: number): string {
  return dayOffset(days).slice(0, 10)
}

export const organization: Organization = {
  id: "org_1",
  name: "Fundación Halketon",
  slug: "halketon",
  status: "active",
  created_at: "2023-02-11T09:00:00Z",
}

export const teams: Team[] = [
  { id: "team_field", organization_id: "org_1", name: "Operaciones de Campo", slug: "campo", description: "Ejecución de programas en terreno", color: "#2a9d8f" },
  { id: "team_outreach", organization_id: "org_1", name: "Vinculación Comunitaria", slug: "comunidad", description: "Vinculación con beneficiarios y WhatsApp", color: "#e9a23b" },
  { id: "team_grants", organization_id: "org_1", name: "Subvenciones y Finanzas", slug: "finanzas", description: "Financiamiento y cumplimiento", color: "#3a86c8" },
  { id: "team_health", organization_id: "org_1", name: "Salud y Nutrición", slug: "salud", description: "Clínicas y programas de nutrición", color: "#d9534f" },
]

export const categories: Category[] = [
  { id: "cat_nutrition", organization_id: "org_1", name: "Nutrición", slug: "nutricion", color: "#2a9d8f" },
  { id: "cat_education", organization_id: "org_1", name: "Educación", slug: "educacion", color: "#3a86c8" },
  { id: "cat_health", organization_id: "org_1", name: "Salud", slug: "salud", color: "#d9534f" },
  { id: "cat_logistics", organization_id: "org_1", name: "Logística", slug: "logistica", color: "#e9a23b" },
]

export const users: User[] = [
  { id: "user_elena", email: "elena.ruiz@halketon.org", display_name: "Elena Ruiz", phone: "+57 300 111 2233", created_at: "2023-02-11T09:00:00Z" },
  { id: "user_marco", email: "marco.silva@halketon.org", display_name: "Marco Silva", phone: "+57 300 222 3344", created_at: "2023-03-02T09:00:00Z" },
  { id: "user_sofia", email: "sofia.mendez@halketon.org", display_name: "Sofía Méndez", phone: "+57 300 333 4455", created_at: "2023-05-20T09:00:00Z" },
  { id: "user_diego", email: "diego.torres@halketon.org", display_name: "Diego Torres", phone: "+57 300 444 5566", created_at: "2023-06-15T09:00:00Z" },
  { id: "user_amara", email: "amara.okafor@halketon.org", display_name: "Amara Okafor", phone: "+57 300 555 6677", created_at: "2024-01-08T09:00:00Z" },
  { id: "user_luis", email: "luis.ramirez@halketon.org", display_name: "Luis Ramírez", phone: "+57 300 666 7788", created_at: "2024-04-22T09:00:00Z" },
]

export const memberships: Membership[] = [
  { id: "mem_elena", organization_id: "org_1", user_id: "user_elena", role: "owner", status: "active", title: "Directora Ejecutiva", team_ids: ["team_grants", "team_field"], category_ids: ["cat_education", "cat_health"], joined_at: "2023-02-11T09:00:00Z", tasks_scope_override: null },
  { id: "mem_marco", organization_id: "org_1", user_id: "user_marco", role: "manager", status: "active", title: "Líder de Operaciones de Campo", team_ids: ["team_field"], category_ids: ["cat_nutrition", "cat_logistics"], joined_at: "2023-03-02T09:00:00Z", tasks_scope_override: null },
  { id: "mem_sofia", organization_id: "org_1", user_id: "user_sofia", role: "member", status: "active", title: "Coordinadora Comunitaria", team_ids: ["team_outreach"], category_ids: ["cat_education"], joined_at: "2023-05-20T09:00:00Z", tasks_scope_override: null },
  { id: "mem_diego", organization_id: "org_1", user_id: "user_diego", role: "admin", status: "active", title: "Gerente de Subvenciones", team_ids: ["team_grants"], category_ids: ["cat_health"], joined_at: "2023-06-15T09:00:00Z", tasks_scope_override: null },
  { id: "mem_amara", organization_id: "org_1", user_id: "user_amara", role: "manager", status: "active", title: "Líder del Programa de Salud", team_ids: ["team_health"], category_ids: ["cat_health", "cat_nutrition"], joined_at: "2024-01-08T09:00:00Z", tasks_scope_override: null },
  { id: "mem_luis", organization_id: "org_1", user_id: "user_luis", role: "member", status: "active", title: "Encargado de Logística", team_ids: ["team_field", "team_outreach"], category_ids: ["cat_logistics"], joined_at: "2024-04-22T09:00:00Z", tasks_scope_override: null },
]

export const people = users.map((u) => ({
  id: `person_${u.id}`,
  organization_id: organization.id,
  display_name: u.display_name,
  user_id: u.id,
  role_label: memberships.find((m) => m.user_id === u.id)?.title ?? null,
}))

export const projects: Project[] = [
  { id: "proj_school_meals", organization_id: "org_1", team_id: "team_health", name: "Programa de Comedores Escolares", slug: "comedores-escolares", description: "Nutrición diaria para 12 escuelas rurales.", status: "active", start_date: "2026-01-15", end_date: "2026-12-15", category_ids: ["cat_nutrition", "cat_education"], created_at: "2026-01-10T09:00:00Z" },
  { id: "proj_mobile_clinic", organization_id: "org_1", team_id: "team_health", name: "Clínica Móvil de Salud", slug: "clinica-movil", description: "Clínicas mensuales en 8 comunidades.", status: "active", start_date: "2026-02-01", end_date: "2026-11-30", category_ids: ["cat_health"], created_at: "2026-01-28T09:00:00Z" },
  { id: "proj_literacy", organization_id: "org_1", team_id: "team_outreach", name: "Iniciativa de Alfabetización de Adultos", slug: "alfabetizacion", description: "Clases nocturnas para adultos.", status: "planning", start_date: "2026-07-01", end_date: null, category_ids: ["cat_education"], created_at: "2026-05-02T09:00:00Z" },
  { id: "proj_water", organization_id: "org_1", team_id: "team_field", name: "Acceso a Agua Potable", slug: "agua-potable", description: "Construcción y mantenimiento de pozos.", status: "active", start_date: "2025-09-01", end_date: "2026-08-31", category_ids: ["cat_health", "cat_logistics"], created_at: "2025-08-20T09:00:00Z" },
  { id: "proj_grant_2026", organization_id: "org_1", team_id: "team_grants", name: "Informes de Subvenciones 2026", slug: "subvenciones-2026", description: "Cumplimiento e informes para donantes.", status: "active", start_date: "2026-01-01", end_date: "2026-12-31", category_ids: [], created_at: "2026-01-02T09:00:00Z" },
  { id: "proj_winter_drive", organization_id: "org_1", team_id: "team_outreach", name: "Campaña de Insumos de Invierno", slug: "campana-invierno", description: "Distribución de insumos antes del invierno.", status: "completed", start_date: "2025-10-01", end_date: "2025-12-20", category_ids: ["cat_logistics"], created_at: "2025-09-15T09:00:00Z" },
]

// Task factory keeps the dataset compact while remaining realistic.
let taskSeq = 0
function task(p: {
  title: string
  owner: string | null
  status: Task["status"]
  priority?: Task["priority"]
  project?: string | null
  team?: string | null
  category?: string | null
  global?: boolean
  due: number | null
  completed?: number | null
  desc?: string
}): Task {
  taskSeq += 1
  return {
    id: `task_${taskSeq}`,
    organization_id: "org_1",
    project_id: p.project ?? null,
    is_global: p.global ?? false,
    team_id: p.team ?? null,
    category_id: p.category ?? null,
    owner_people_id: null,
    owner_user_id: p.owner,
    owner_name: null,
    task_title: p.title,
    description: p.desc ?? null,
    due_date: p.due === null ? null : dateOffset(p.due),
    status: p.status,
    priority: p.priority ?? "normal",
    source_type: "manual",
    confidence: null,
    created_at: dayOffset(p.due === null ? -20 : p.due - 14),
    completed_at: p.completed != null ? dayOffset(p.completed) : null,
  }
}

export const tasks: Task[] = [
  // Elena (propietaria)
  task({ title: "Aprobar informe de donantes Q2", owner: "user_elena", status: "in_progress", priority: "high", project: "proj_grant_2026", team: "team_grants", due: 3 }),
  task({ title: "Preparar presentación para la junta", owner: "user_elena", status: "pending", priority: "high", team: "team_grants", category: "cat_education", due: 6 }),
  task({ title: "Firmar contrato con proveedor de clínica", owner: "user_elena", status: "pending", priority: "urgent", project: "proj_mobile_clinic", team: "team_health", due: 1 }),
  task({ title: "Revisar estrategia anual", owner: "user_elena", status: "done", project: "proj_grant_2026", due: -8, completed: -7 }),
  task({ title: "Finalizar presupuesto 2026", owner: "user_elena", status: "done", priority: "high", team: "team_grants", due: -20, completed: -18 }),
  task({ title: "Contratar líder de programa de salud", owner: "user_elena", status: "done", due: -40, completed: -38 }),

  // Marco (líder de campo)
  task({ title: "Coordinar estudio del sitio del pozo", owner: "user_marco", status: "in_progress", priority: "high", project: "proj_water", team: "team_field", category: "cat_logistics", due: 2 }),
  task({ title: "Programar entregas de alimentos", owner: "user_marco", status: "pending", project: "proj_school_meals", team: "team_field", category: "cat_logistics", due: 4 }),
  task({ title: "Inspeccionar bodega de almacenamiento", owner: "user_marco", status: "blocked", priority: "high", team: "team_field", due: -1, desc: "Bloqueada: a la espera de acceso del arrendador." }),
  task({ title: "Capacitar a nuevos voluntarios de campo", owner: "user_marco", status: "pending", project: "proj_water", due: 9 }),
  task({ title: "Enviar informe de gastos de combustible", owner: "user_marco", status: "done", team: "team_field", due: -5, completed: -4 }),
  task({ title: "Mapear 3 nuevas rutas de entrega", owner: "user_marco", status: "done", project: "proj_school_meals", due: -12, completed: -10 }),
  task({ title: "Reparar furgoneta de transporte de clínica", owner: "user_marco", status: "done", priority: "high", due: -22, completed: -19 }),

  // Sofía (coordinadora comunitaria)
  task({ title: "Reclutar docentes de alfabetización", owner: "user_sofia", status: "in_progress", project: "proj_literacy", team: "team_outreach", category: "cat_education", due: 5 }),
  task({ title: "Contactar por WhatsApp a 50 familias", owner: "user_sofia", status: "pending", priority: "high", team: "team_outreach", due: 2 }),
  task({ title: "Traducir formularios de inscripción", owner: "user_sofia", status: "pending", project: "proj_literacy", category: "cat_education", due: 8 }),
  task({ title: "Realizar sesión de retroalimentación comunitaria", owner: "user_sofia", status: "done", team: "team_outreach", due: -3, completed: -3 }),
  task({ title: "Distribuir folletos del programa", owner: "user_sofia", status: "done", project: "proj_winter_drive", due: -30, completed: -28 }),

  // Diego (subvenciones)
  task({ title: "Conciliar desembolsos de subvenciones", owner: "user_diego", status: "in_progress", priority: "high", project: "proj_grant_2026", team: "team_grants", due: 1 }),
  task({ title: "Preparar paquete de auditoría de donantes", owner: "user_diego", status: "pending", priority: "urgent", project: "proj_grant_2026", team: "team_grants", due: 4 }),
  task({ title: "Presentar certificado de cumplimiento", owner: "user_diego", status: "blocked", team: "team_grants", category: "cat_health", due: -2, desc: "Bloqueada: a la espera de formularios firmados." }),
  task({ title: "Presentar estado financiero Q1", owner: "user_diego", status: "done", priority: "high", due: -15, completed: -14 }),
  task({ title: "Renovar registro de la organización", owner: "user_diego", status: "done", due: -35, completed: -33 }),

  // Amara (líder de salud)
  task({ title: "Pedir almacenamiento en frío para vacunas", owner: "user_amara", status: "in_progress", priority: "urgent", project: "proj_mobile_clinic", team: "team_health", category: "cat_health", due: 0 }),
  task({ title: "Planificar rotación de clínicas de junio", owner: "user_amara", status: "pending", priority: "high", project: "proj_mobile_clinic", team: "team_health", due: 3 }),
  task({ title: "Analizar encuesta de nutrición", owner: "user_amara", status: "pending", project: "proj_school_meals", category: "cat_nutrition", due: 7 }),
  task({ title: "Incorporar 2 enfermeras comunitarias", owner: "user_amara", status: "done", team: "team_health", due: -6, completed: -5 }),
  task({ title: "Publicar métricas de salud de mayo", owner: "user_amara", status: "done", project: "proj_mobile_clinic", due: -10, completed: -9 }),
  task({ title: "Configurar sistema de referencias de clínica", owner: "user_amara", status: "done", priority: "high", due: -25, completed: -21 }),

  // Luis (logística)
  task({ title: "Inventariar insumos de invierno", owner: "user_luis", status: "in_progress", project: "proj_water", team: "team_field", category: "cat_logistics", due: 2 }),
  task({ title: "Coordinar transporte de bomba de agua", owner: "user_luis", status: "pending", priority: "high", project: "proj_water", team: "team_field", due: 5 }),
  task({ title: "Actualizar hoja de seguimiento de activos", owner: "user_luis", status: "blocked", team: "team_field", due: 1, desc: "Bloqueada: faltan números de serie." }),
  task({ title: "Recolectar confirmaciones de entrega", owner: "user_luis", status: "done", project: "proj_school_meals", due: -4, completed: -4 }),
  task({ title: "Empacar cajas de la campaña de invierno", owner: "user_luis", status: "done", project: "proj_winter_drive", due: -28, completed: -27 }),

  // Tareas globales / sin asignar de la organización
  task({ title: "Actualizar política de salvaguarda de la organización", owner: null, status: "pending", global: true, priority: "high", due: 10 }),
  task({ title: "Capacitación de privacidad de datos para todo el personal", owner: null, status: "pending", global: true, due: 14 }),
]

tasks[10] = { ...tasks[10], source_type: "whatsapp", confidence: 0.62 }
tasks[20] = { ...tasks[20], source_type: "meeting", confidence: 0.55 }

export const meetings: Meeting[] = [
  {
    id: "meet_1",
    organization_id: "org_1",
    project_id: "proj_literacy",
    title: "Reunión de planificación alfabetización",
    summary: "Se acordó reclutar 4 docentes y abrir inscripciones en julio.",
    created_at: dayOffset(-3),
    linked_task_ids: ["task_11"],
  },
  {
    id: "meet_2",
    organization_id: "org_1",
    project_id: "proj_mobile_clinic",
    title: "Sync clínica móvil",
    summary: "Prioridad: cadena de frío y rotación de junio.",
    created_at: dayOffset(-8),
    linked_task_ids: ["task_28", "task_29"],
  },
]

export const reminders: Reminder[] = [
  {
    id: "rem_1",
    task_id: "task_3",
    task_title: "Firmar contrato con proveedor de clínica",
    owner_label: "Elena Ruiz",
    scheduled_at: dayOffset(-1),
    sent_at: null,
  },
  {
    id: "rem_2",
    task_id: "task_18",
    task_title: "Conciliar desembolsos de subvenciones",
    owner_label: "Diego Torres",
    scheduled_at: dayOffset(0),
    sent_at: null,
  },
]

export const inboundMessages: InboundMessage[] = [
  {
    id: "inb_1",
    organization_id: "org_1",
    sender_name: "María López",
    body: "Necesitamos más raciones en la escuela del norte",
    received_at: dayOffset(-2),
  },
  {
    id: "inb_2",
    organization_id: "org_1",
    sender_name: "Carlos Pérez",
    body: "Confirmo entrega de bombas de agua",
    received_at: dayOffset(-1),
  },
  {
    id: "inb_3",
    organization_id: "org_1",
    sender_name: "Ana Gómez",
    body: "Tarea: revisar inventario de vacunas",
    received_at: dayOffset(0),
  },
]
