import "server-only"
import type {
  OrgOverview,
  UserProfile,
  Task,
  TaskStatus,
  User,
  Membership,
  TaskWithRefs,
  ProjectDetail,
  GeneralTasksView,
} from "@/lib/types"
import * as mock from "@/lib/mock-data"
import { resolveRange, type RangePreset, type DateRange } from "@/lib/date-ranges"

// ---------------------------------------------------------------------------
// Data layer. Flip USE_SUPABASE (via DATA_SOURCE env) to read live data.
// All UI reads through these functions, so swapping the source is isolated.
// ---------------------------------------------------------------------------

export const USE_SUPABASE = process.env.DATA_SOURCE === "supabase"

const REFERENCE_DATE = new Date("2026-06-06T12:00:00Z")

function isOverdue(task: Task): boolean {
  if (!task.due_date) return false
  if (task.status === "done" || task.status === "cancelled") return false
  return new Date(task.due_date) < REFERENCE_DATE
}

function computeStatusBreakdown(tasks: Task[]): { status: TaskStatus; count: number }[] {
  const order: TaskStatus[] = ["pending", "in_progress", "blocked", "done", "cancelled"]
  return order
    .map((status) => ({ status, count: tasks.filter((t) => t.status === status).length }))
    .filter((s) => s.count > 0)
}

// Una tarea entra en el rango si alguna de sus fechas relevantes (vencimiento,
// finalización o creación) cae dentro del intervalo seleccionado.
function taskInRange(task: Task, range: DateRange | null): boolean {
  if (!range) return true
  const candidates = [task.due_date, task.completed_at, task.created_at]
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d.length === 10 ? d + "T00:00:00Z" : d))
  return candidates.some((d) => d >= range.from && d <= range.to)
}

// --- Mock implementations ---------------------------------------------------

function getOrgOverviewMock(range: DateRange | null): OrgOverview {
  const { organization, teams, categories, projects, memberships } = mock
  const tasks = mock.tasks.filter((t) => taskInRange(t, range))

  const completed = tasks.filter((t) => t.status === "done")
  const inProgress = tasks.filter((t) => t.status === "in_progress")
  const pending = tasks.filter((t) => t.status === "pending")
  const blocked = tasks.filter((t) => t.status === "blocked")
  const overdue = tasks.filter(isOverdue)
  const finishedOrTotal = tasks.filter((t) => t.status !== "cancelled")

  const teamLoad = teams.map((team) => {
    const teamTasks = tasks.filter((t) => t.team_id === team.id)
    return {
      team,
      open: teamTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
      completed: teamTasks.filter((t) => t.status === "done").length,
      members: memberships.filter((m) => m.team_ids.includes(team.id)).length,
    }
  })

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((t) => ({
      ...t,
      ownerName: mock.users.find((u) => u.id === t.owner_id)?.display_name ?? null,
      projectName: mock.projects.find((p) => p.id === t.project_id)?.name ?? null,
    }))

  return {
    organization,
    memberCount: memberships.filter((m) => m.status === "active").length,
    teams,
    categories,
    projects,
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
  }
}

function buildProfile(user: User, membership: Membership, range: DateRange | null = null): UserProfile {
  const userTasks = mock.tasks.filter((t) => t.owner_id === user.id && taskInRange(t, range))
  const completedTasks = userTasks
    .filter((t) => t.status === "done")
    .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
  const upcomingTasks = userTasks
    .filter((t) => t.status === "pending" || t.status === "in_progress" || t.status === "blocked")
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  const overdue = userTasks.filter(isOverdue)
  const active = userTasks.filter((t) => t.status !== "cancelled")

  return {
    user,
    membership,
    teams: mock.teams.filter((t) => membership.team_ids.includes(t.id)),
    categories: mock.categories.filter((c) => membership.category_ids.includes(c.id)),
    completedTasks,
    upcomingTasks,
    stats: {
      total: userTasks.length,
      completed: completedTasks.length,
      upcoming: upcomingTasks.length,
      overdue: overdue.length,
      completionRate: active.length
        ? Math.round((completedTasks.length / active.length) * 100)
        : 0,
    },
  }
}

function getPeopleMock(): UserProfile[] {
  return mock.memberships
    .map((m) => {
      const user = mock.users.find((u) => u.id === m.user_id)
      return user ? buildProfile(user, m) : null
    })
    .filter((p): p is UserProfile => p !== null)
}

function getUserProfileMock(userId: string, range: DateRange | null): UserProfile | null {
  const membership = mock.memberships.find((m) => m.user_id === userId)
  const user = mock.users.find((u) => u.id === userId)
  if (!membership || !user) return null
  return buildProfile(user, membership, range)
}

// --- Tasks: project detail & general (unassigned) tasks ---------------------

function withRefs(task: Task): TaskWithRefs {
  const owner = mock.users.find((u) => u.id === task.owner_id)
  return {
    ...task,
    ownerId: task.owner_id,
    ownerName: owner?.display_name ?? null,
    ownerAvatar: owner?.avatar_url ?? null,
    projectName: mock.projects.find((p) => p.id === task.project_id)?.name ?? null,
    teamName: mock.teams.find((t) => t.id === task.team_id)?.name ?? null,
  }
}

function splitTasks(tasks: Task[]) {
  const enriched = tasks.map(withRefs)
  const completedTasks = enriched
    .filter((t) => t.status === "done")
    .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
  const pendingTasks = enriched
    .filter((t) => t.status === "pending" || t.status === "in_progress" || t.status === "blocked")
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

function getProjectDetailMock(slug: string, range: DateRange | null): ProjectDetail | null {
  const project = mock.projects.find((p) => p.slug === slug || p.id === slug)
  if (!project) return null
  const tasks = mock.tasks.filter((t) => t.project_id === project.id && taskInRange(t, range))
  const split = splitTasks(tasks)
  return {
    project,
    team: mock.teams.find((t) => t.id === project.team_id) ?? null,
    categories: mock.categories.filter((c) => project.category_ids.includes(c.id)),
    ...split,
  }
}

function getGeneralTasksMock(range: DateRange | null): GeneralTasksView {
  const tasks = mock.tasks.filter((t) => t.project_id === null && taskInRange(t, range))
  return splitTasks(tasks)
}

// --- Public API -------------------------------------------------------------
// When USE_SUPABASE is true, replace the bodies below with Supabase queries
// (see lib/supabase-queries.ts.example for the intended shape).

export async function getOrgOverview(opts?: {
  preset?: RangePreset
  from?: string
  to?: string
}): Promise<OrgOverview> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) {
    // const supabase = createClient(); ...consulta y agrega con filtro de rango...
    throw new Error("Origen de datos Supabase aún no conectado. Ver lib/supabase-queries.ts.example")
  }
  return getOrgOverviewMock(range)
}

export async function getPeople(): Promise<UserProfile[]> {
  if (USE_SUPABASE) {
    throw new Error("Origen de datos Supabase aún no conectado. Ver lib/supabase-queries.ts.example")
  }
  return getPeopleMock()
}

export async function getUserProfile(
  userId: string,
  opts?: { preset?: RangePreset; from?: string; to?: string },
): Promise<UserProfile | null> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) {
    throw new Error("Origen de datos Supabase aún no conectado. Ver lib/supabase-queries.ts.example")
  }
  return getUserProfileMock(userId, range)
}

export async function getProjectDetail(
  slug: string,
  opts?: { preset?: RangePreset; from?: string; to?: string },
): Promise<ProjectDetail | null> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) {
    throw new Error("Origen de datos Supabase aún no conectado. Ver lib/supabase-queries.ts.example")
  }
  return getProjectDetailMock(slug, range)
}

export async function getGeneralTasks(opts?: {
  preset?: RangePreset
  from?: string
  to?: string
}): Promise<GeneralTasksView> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) {
    throw new Error("Origen de datos Supabase aún no conectado. Ver lib/supabase-queries.ts.example")
  }
  return getGeneralTasksMock(range)
}
