import type {
  OrgOverview,
  UserProfile,
  Task,
  TaskStatus,
  TaskPriority,
  User,
  Membership,
  TaskWithRefs,
  ProjectDetail,
  GeneralTasksView,
  Organization,
  Team,
  Category,
  Project,
  Person,
  Meeting,
  Reminder,
  InboundMessage,
  DashboardSummary,
  SessionContext,
  OrgFeatures,
  DashboardFilters,
} from "@/lib/types"
import type { DateRange } from "@/lib/date-ranges"
import { referenceNow } from "@/lib/data-source"
import { applyDashboardFilters, applyTaskVisibility } from "@/lib/filters"
import { effectiveTasksScope } from "@/lib/permissions"

export interface OrgDataset {
  organization: Organization
  teams: Team[]
  categories: Category[]
  projects: Project[]
  memberships: Membership[]
  users: User[]
  people: Person[]
  tasks: Task[]
  meetings: Meeting[]
  reminders: Reminder[]
  inboundMessages: InboundMessage[]
}

export interface TaskContext {
  users: User[]
  projects: Project[]
  teams: Team[]
  categories: Category[]
  people: Person[]
}

export function isOpen(task: Task): boolean {
  return task.status === "pending" || task.status === "in_progress" || task.status === "blocked"
}

export function isOverdue(task: Task): boolean {
  if (!task.due_date) return false
  if (!isOpen(task)) return false
  const due = new Date(task.due_date.length === 10 ? task.due_date + "T00:00:00Z" : task.due_date)
  return due < referenceNow()
}

export function taskInRange(
  task: Task,
  range: DateRange | null,
  dateMode: "due_date" | "created_at" = "due_date",
): boolean {
  if (!range) return true
  const primary = dateMode === "created_at" ? task.created_at : task.due_date
  const candidates = [primary, task.completed_at, task.created_at]
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d.length === 10 ? d + "T00:00:00Z" : d))
  return candidates.some((d) => d >= range.from && d <= range.to)
}

export function computeStatusBreakdown(tasks: Task[]): { status: TaskStatus; count: number }[] {
  const order: TaskStatus[] = ["pending", "in_progress", "blocked", "done", "cancelled"]
  return order
    .map((status) => ({ status, count: tasks.filter((t) => t.status === status).length }))
    .filter((s) => s.count > 0)
}

export function ownerLabel(task: Task, ctx: TaskContext): string {
  if (task.owner_user_id) {
    return ctx.users.find((u) => u.id === task.owner_user_id)?.display_name ?? task.owner_name ?? "Sin responsable"
  }
  if (task.owner_name) return task.owner_name
  if (task.owner_people_id) {
    return ctx.people.find((p) => p.id === task.owner_people_id)?.display_name ?? "Sin responsable"
  }
  return "Sin responsable"
}

export function withRefs(task: Task, ctx: TaskContext): TaskWithRefs {
  const owner = task.owner_user_id ? ctx.users.find((u) => u.id === task.owner_user_id) : undefined
  return {
    ...task,
    ownerId: task.owner_user_id ?? task.owner_people_id,
    ownerName: owner?.display_name ?? task.owner_name ?? ownerLabel(task, ctx),
    projectName: ctx.projects.find((p) => p.id === task.project_id)?.name ?? null,
    teamName: ctx.teams.find((t) => t.id === task.team_id)?.name ?? null,
  }
}

export function visibleTasks(
  dataset: OrgDataset,
  session: SessionContext,
  filters: DashboardFilters,
  range: DateRange | null,
): Task[] {
  const scope = effectiveTasksScope(session.membership, session.permissions)
  const scoped = applyTaskVisibility(
    dataset.tasks,
    scope,
    session.membership,
    dataset.people,
    session.permissions.can_view_global_tasks,
  )
  return applyDashboardFilters(scoped, filters, range)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function dateKey(iso: string): string {
  return iso.slice(0, 10)
}

function dueBucket(task: Task): string | null {
  if (!isOpen(task)) return null
  if (!task.due_date) return "sin_fecha"
  const today = referenceNow()
  const due = new Date(task.due_date.length === 10 ? task.due_date + "T00:00:00Z" : task.due_date)
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  if (due < todayStart) return "vencidas"
  if (due.getTime() === todayStart.getTime()) return "hoy"
  const in7 = addDays(todayStart, 7)
  if (due <= in7) return "1_7_dias"
  const in30 = addDays(todayStart, 30)
  if (due <= in30) return "8_30_dias"
  return "mas_30_dias"
}

const BUCKET_LABELS: Record<string, string> = {
  vencidas: "Vencidas",
  hoy: "Hoy",
  "1_7_dias": "1–7 días",
  "8_30_dias": "8–30 días",
  sin_fecha: "Sin fecha",
  mas_30_dias: "+30 días",
}

export function buildDashboardSummary(
  tasks: Task[],
  projects: Project[],
  meetings: Meeting[],
  reminders: Reminder[],
  inboundMessages: InboundMessage[],
  ctx: TaskContext,
  range: DateRange | null,
): DashboardSummary {
  const open = tasks.filter(isOpen)
  const now = referenceNow()

  const kpis = {
    openTasks: open.length,
    overdueTasks: open.filter(isOverdue).length,
    dueThisWeekTasks: open.filter((t) => {
      if (!t.due_date) return false
      const due = new Date(t.due_date.length === 10 ? t.due_date + "T00:00:00Z" : t.due_date)
      const end = addDays(now, 7)
      return due >= now && due <= end
    }).length,
    blockedTasks: tasks.filter((t) => t.status === "blocked").length,
    unownedTasks: tasks.filter(
      (t) => isOpen(t) && !t.owner_people_id && !t.owner_user_id && !t.owner_name,
    ).length,
    unresolvedOwnerTasks: tasks.filter(
      (t) => isOpen(t) && !t.owner_people_id && !t.owner_user_id && Boolean(t.owner_name),
    ).length,
    highPriorityOpenTasks: open.filter((t) => t.priority === "high" || t.priority === "urgent").length,
    openGlobalTasks: open.filter((t) => t.is_global).length,
    activeProjects: projects.filter((p) => p.status === "active" || p.status === "planning").length,
    meetingsInRange: meetings.filter((m) => inRangeIso(m.created_at, range)).length,
    pendingReminders: reminders.filter((r) => !r.sent_at && new Date(r.scheduled_at) <= now).length,
    inboundMessagesInRange: inboundMessages.filter((m) => inRangeIso(m.received_at, range)).length,
  }

  const bucketOrder = ["vencidas", "hoy", "1_7_dias", "8_30_dias", "mas_30_dias", "sin_fecha"]
  const bucketCounts = new Map<string, number>()
  for (const task of open) {
    const b = dueBucket(task)
    if (!b) continue
    bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1)
  }

  const workloadMap = new Map<
    string | null,
    { label: string; openTasks: number; overdueTasks: number; blockedTasks: number }
  >()

  for (const task of tasks) {
    const key = task.owner_people_id
    const label = ownerLabel(task, ctx)
    const entry = workloadMap.get(key) ?? { label, openTasks: 0, overdueTasks: 0, blockedTasks: 0 }
    if (isOpen(task)) entry.openTasks += 1
    if (isOverdue(task)) entry.overdueTasks += 1
    if (task.status === "blocked") entry.blockedTasks += 1
    workloadMap.set(key, entry)
  }

  const enriched = tasks.map((t) => withRefs(t, ctx))

  const tasksByTeamAndStatus = computeGroupStatusBreakdown(tasks, "team", ctx)
  const tasksByCategoryAndStatus = computeGroupStatusBreakdown(tasks, "category", ctx)

  return {
    kpis,
    charts: {
      dueDateBuckets: bucketOrder
        .filter((b) => (bucketCounts.get(b) ?? 0) > 0)
        .map((bucket) => ({
          bucket,
          label: BUCKET_LABELS[bucket] ?? bucket,
          count: bucketCounts.get(bucket) ?? 0,
        })),
      tasksCreatedByDay: seriesByDay(tasks.map((t) => t.created_at), range),
      inboundMessagesByDay: seriesByDay(
        inboundMessages.map((m) => m.received_at),
        range,
      ),
      tasksByStatus: computeStatusBreakdown(tasks).map((s) => ({
        status: s.status,
        count: s.count,
      })),
      tasksByPriority: (["low", "normal", "high", "urgent"] as TaskPriority[])
        .map((priority) => ({ priority, count: tasks.filter((t) => t.priority === priority).length }))
        .filter((s) => s.count > 0),
      tasksBySource: groupBySource(tasks),
      workloadByOwner: [...workloadMap.entries()]
        .map(([ownerPeopleId, w]) => ({
          ownerPeopleId,
          ownerLabel: w.label,
          openTasks: w.openTasks,
          overdueTasks: w.overdueTasks,
          blockedTasks: w.blockedTasks,
        }))
        .sort((a, b) => b.openTasks - a.openTasks || b.overdueTasks - a.overdueTasks),
      tasksByTeamAndStatus,
      tasksByCategoryAndStatus,
    },
    lists: {
      overdue: enriched
        .filter(isOverdue)
        .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime()),
      dueSoon: enriched
        .filter((t) => isOpen(t) && !isOverdue(t) && t.due_date)
        .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime())
        .slice(0, 10),
      blocked: enriched
        .filter((t) => t.status === "blocked")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      unowned: enriched.filter(
        (t) => isOpen(t) && !t.owner_people_id && !t.owner_user_id && !t.owner_name,
      ),
      lowConfidence: enriched
        .filter((t) => t.confidence != null && t.confidence < 0.75)
        .sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1)),
      pendingReminders: reminders
        .filter((r) => !r.sent_at && new Date(r.scheduled_at) <= now)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
      recentMeetings: [...meetings]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    },
  }
}

function inRangeIso(iso: string, range: DateRange | null): boolean {
  if (!range) return true
  const d = new Date(iso)
  return d >= range.from && d <= range.to
}

function seriesByDay(dates: string[], range: DateRange | null): Array<{ day: string; count: number }> {
  const counts = new Map<string, number>()
  for (const iso of dates) {
    if (!inRangeIso(iso, range)) continue
    const day = dateKey(iso)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }))
}

export function toStackedChartRows(
  flat: Array<{
    teamId?: string
    teamName?: string
    categoryId?: string
    categoryName?: string
    status: TaskStatus
    count: number
  }>,
  idKey: "teamId" | "categoryId",
  labelKey: "teamName" | "categoryName",
) {
  const map = new Map<string, { id: string; label: string; segments: Array<{ status: TaskStatus; count: number }> }>()
  for (const row of flat) {
    const id = (row[idKey] as string) || "__none__"
    const label = (row[labelKey] as string) || "Sin asignar"
    const entry = map.get(id) ?? { id, label, segments: [] }
    entry.segments.push({ status: row.status, count: row.count })
    map.set(id, entry)
  }
  return [...map.values()].sort((a, b) => {
    const total = (rows: typeof a.segments) => rows.reduce((s, r) => s + r.count, 0)
    return total(b.segments) - total(a.segments)
  })
}

function computeGroupStatusBreakdown(
  tasks: Task[],
  kind: "team" | "category",
  ctx: TaskContext,
): Array<{
  teamId?: string
  teamName?: string
  categoryId?: string
  categoryName?: string
  status: TaskStatus
  count: number
}> {
  const map = new Map<string, Map<TaskStatus, number>>()
  for (const task of tasks) {
    const key = (kind === "team" ? task.team_id : task.category_id) ?? "__none__"
    const statusMap = map.get(key) ?? new Map<TaskStatus, number>()
    statusMap.set(task.status, (statusMap.get(task.status) ?? 0) + 1)
    map.set(key, statusMap)
  }

  const rows: Array<{
    teamId?: string
    teamName?: string
    categoryId?: string
    categoryName?: string
    status: TaskStatus
    count: number
  }> = []
  for (const [key, statusMap] of map.entries()) {
    const id = key === "__none__" ? "" : key
    const name =
      kind === "team"
        ? (ctx.teams.find((t) => t.id === id)?.name ?? "Sin equipo")
        : (ctx.categories.find((c) => c.id === id)?.name ?? "Sin categoría")
    for (const [status, count] of statusMap.entries()) {
      if (kind === "team") {
        rows.push({ teamId: id, teamName: name, status, count })
      } else {
        rows.push({ categoryId: id, categoryName: name, status, count })
      }
    }
  }
  return rows
}

function groupBySource(tasks: Task[]): Array<{ sourceType: string; count: number }> {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    const key = task.source_type ?? "unknown"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].map(([sourceType, count]) => ({ sourceType, count }))
}

export function buildOrgOverview(
  dataset: OrgDataset,
  session: SessionContext,
  features: OrgFeatures,
  filters: DashboardFilters,
  range: DateRange | null,
): OrgOverview {
  const { organization, teams, categories, projects, memberships } = dataset
  const tasks = visibleTasks(dataset, session, filters, range)
  const ctx: TaskContext = {
    users: dataset.users,
    projects: dataset.projects,
    teams: dataset.teams,
    categories: dataset.categories,
    people: dataset.people,
  }

  const completed = tasks.filter((t) => t.status === "done")
  const inProgress = tasks.filter((t) => t.status === "in_progress")
  const pending = tasks.filter((t) => t.status === "pending")
  const blocked = tasks.filter((t) => t.status === "blocked")
  const overdue = tasks.filter(isOverdue)
  const finishedOrTotal = tasks.filter((t) => t.status !== "cancelled")

  const teamLoad = features.team_load_view
    ? teams.map((team) => {
        const teamTasks = tasks.filter((t) => t.team_id === team.id)
        return {
          team,
          open: teamTasks.filter(isOpen).length,
          completed: teamTasks.filter((t) => t.status === "done").length,
          members: memberships.filter((m) => m.team_ids.includes(team.id)).length,
        }
      })
    : []

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((t) => ({
      ...t,
      ownerName: ownerLabel(t, ctx),
      projectName: projects.find((p) => p.id === t.project_id)?.name ?? null,
    }))

  const filteredMeetings = features.meeting_memory
    ? meetingsInOrg(dataset.meetings, range)
    : []
  const filteredReminders = features.reminders ? dataset.reminders : []
  const filteredInbound = features.whatsapp_capture ? dataset.inboundMessages : []

  return {
    organization,
    memberCount: memberships.filter((m) => m.status === "active").length,
    teams,
    categories,
    projects,
    people: dataset.people,
    session,
    features,
    stats: {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      inProgressTasks: inProgress.length,
      pendingTasks: pending.length,
      blockedTasks: blocked.length,
      overdueTasks: overdue.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      completedProjects: projects.filter((p) => p.status === "completed").length,
      completionRate: finishedOrTotal.length
        ? Math.round((completed.length / finishedOrTotal.length) * 100)
        : 0,
    },
    statusBreakdown: computeStatusBreakdown(tasks),
    teamLoad,
    recentTasks,
    projectProgress: projects.map((p) => {
      const pt = tasks.filter((t) => t.project_id === p.id)
      return {
        projectId: p.id,
        total: pt.length,
        completed: pt.filter((t) => t.status === "done").length,
      }
    }),
    summary: buildDashboardSummary(
      tasks,
      projects,
      filteredMeetings,
      filteredReminders,
      filteredInbound,
      ctx,
      range,
    ),
  }
}

function meetingsInOrg(meetings: Meeting[], range: DateRange | null): Meeting[] {
  return meetings.filter((m) => inRangeIso(m.created_at, range))
}

export function buildProfile(
  user: User,
  membership: Membership,
  allTasks: Task[],
  teams: Team[],
  categories: Category[],
  people: Person[] = [],
  range: DateRange | null = null,
): UserProfile {
  const peopleIds = people.filter((p) => p.user_id === user.id).map((p) => p.id)
  const owned = allTasks.filter(
    (t) =>
      taskInRange(t, range) &&
      (t.owner_user_id === user.id ||
        (t.owner_people_id != null && peopleIds.includes(t.owner_people_id))),
  )
  const completedTasks = owned
    .filter((t) => t.status === "done")
    .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
  const upcomingTasks = owned
    .filter(isOpen)
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  const overdue = owned.filter(isOverdue)
  const active = owned.filter((t) => t.status !== "cancelled")

  return {
    user,
    membership,
    teams: teams.filter((t) => membership.team_ids.includes(t.id)),
    categories: categories.filter((c) => membership.category_ids.includes(c.id)),
    completedTasks,
    upcomingTasks,
    stats: {
      total: owned.length,
      completed: completedTasks.length,
      upcoming: upcomingTasks.length,
      overdue: overdue.length,
      completionRate: active.length ? Math.round((completedTasks.length / active.length) * 100) : 0,
    },
  }
}

export function buildAllProfiles(dataset: OrgDataset, range: DateRange | null = null): UserProfile[] {
  return dataset.memberships
    .map((m) => {
      const user = dataset.users.find((u) => u.id === m.user_id)
      return user
        ? buildProfile(user, m, dataset.tasks, dataset.teams, dataset.categories, dataset.people, range)
        : null
    })
    .filter((p): p is UserProfile => p !== null)
}

export function splitTasks(tasks: Task[], ctx: TaskContext) {
  const enriched = tasks.map((t) => withRefs(t, ctx))
  const completedTasks = enriched
    .filter((t) => t.status === "done")
    .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
  const pendingTasks = enriched
    .filter(isOpen)
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  const overdue = enriched.filter(isOverdue)
  const active = enriched.filter((t) => t.status !== "cancelled")
  return {
    completedTasks,
    pendingTasks,
    stats: {
      total: enriched.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdue.length,
      completionRate: active.length ? Math.round((completedTasks.length / active.length) * 100) : 0,
    },
  }
}

export function buildProjectDetail(
  dataset: OrgDataset,
  slug: string,
  range: DateRange | null,
): ProjectDetail | null {
  const project = dataset.projects.find((p) => p.slug === slug || p.id === slug)
  if (!project) return null
  const tasks = dataset.tasks.filter((t) => t.project_id === project.id && taskInRange(t, range))
  const ctx: TaskContext = {
    users: dataset.users,
    projects: dataset.projects,
    teams: dataset.teams,
    categories: dataset.categories,
    people: dataset.people,
  }
  const split = splitTasks(tasks, ctx)
  return {
    project,
    team: dataset.teams.find((t) => t.id === project.team_id) ?? null,
    categories: dataset.categories.filter((c) => project.category_ids.includes(c.id)),
    ...split,
  }
}

function taskContextFromDataset(dataset: OrgDataset): TaskContext {
  return {
    users: dataset.users,
    projects: dataset.projects,
    teams: dataset.teams,
    categories: dataset.categories,
    people: dataset.people,
  }
}

function visibleTasksInRange(
  dataset: OrgDataset,
  session: SessionContext,
  range: DateRange | null,
  match: (task: Task) => boolean,
): Task[] {
  const scope = effectiveTasksScope(session.membership, session.permissions)
  const scoped = applyTaskVisibility(
    dataset.tasks,
    scope,
    session.membership,
    dataset.people,
    session.permissions.can_view_global_tasks,
  )
  return scoped.filter((t) => match(t) && taskInRange(t, range))
}

export function buildGlobalTasks(
  dataset: OrgDataset,
  session: SessionContext,
  range: DateRange | null,
): GeneralTasksView {
  const tasks = visibleTasksInRange(dataset, session, range, (t) => t.is_global)
  return splitTasks(tasks, taskContextFromDataset(dataset))
}

export function buildStandaloneTasks(
  dataset: OrgDataset,
  session: SessionContext,
  range: DateRange | null,
): GeneralTasksView {
  const tasks = visibleTasksInRange(
    dataset,
    session,
    range,
    (t) => t.project_id === null && !t.is_global,
  )
  return splitTasks(tasks, taskContextFromDataset(dataset))
}

/** @deprecated Use buildStandaloneTasks — excludes globals per ADR 0006 */
export function buildGeneralTasks(dataset: OrgDataset, range: DateRange | null): GeneralTasksView {
  const tasks = dataset.tasks.filter((t) => t.project_id === null && !t.is_global && taskInRange(t, range))
  return splitTasks(tasks, taskContextFromDataset(dataset))
}

export interface TeamHierarchyRow {
  teamId: string | null
  teamName: string
  openTasks: number
  overdueTasks: number
  categories: { categoryId: string | null; categoryName: string; openTasks: number }[]
}

export function buildTeamHierarchy(
  dataset: OrgDataset,
  session: SessionContext,
  range: DateRange | null,
): TeamHierarchyRow[] {
  const tasks = visibleTasksInRange(dataset, session, range, () => true).filter(isOpen)
  const ctx = taskContextFromDataset(dataset)
  const teamIds = [...dataset.teams.map((t) => t.id), null]

  return teamIds.map((teamId) => {
    const teamTasks = tasks.filter((t) => t.team_id === teamId)
    const teamName = teamId ? (ctx.teams.find((t) => t.id === teamId)?.name ?? "Equipo") : "Sin equipo"
    const categoryIds = [
      ...new Set(teamTasks.map((t) => t.category_id).filter((id): id is string => id != null)),
      ...(teamTasks.some((t) => !t.category_id) ? [null] : []),
    ]

    return {
      teamId,
      teamName,
      openTasks: teamTasks.length,
      overdueTasks: teamTasks.filter(isOverdue).length,
      categories: categoryIds.map((categoryId) => {
        const catTasks = teamTasks.filter((t) => t.category_id === categoryId)
        const categoryName = categoryId
          ? (ctx.categories.find((c) => c.id === categoryId)?.name ?? "Categoría")
          : "Sin categoría"
        return { categoryId, categoryName, openTasks: catTasks.length }
      }),
    }
  }).filter((row) => row.openTasks > 0)
}

export function buildTaskListView(
  dataset: OrgDataset,
  session: SessionContext,
  filters: DashboardFilters,
  range: DateRange | null,
) {
  const tasks = visibleTasks(dataset, session, filters, range)
  const ctx: TaskContext = {
    users: dataset.users,
    projects: dataset.projects,
    teams: dataset.teams,
    categories: dataset.categories,
    people: dataset.people,
  }
  return splitTasks(tasks, ctx)
}
