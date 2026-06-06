import type { DashboardFilters, Membership, Person, RolePermissions, Task, TasksScope } from "@/lib/types"
import type { DateRange } from "@/lib/date-ranges"
import { effectiveTasksScope } from "@/lib/permissions"
import { isOpen, taskInRange } from "@/lib/aggregations"

export function parseDashboardFilters(
  session: { organizationId: string; membershipId: string; userId: string },
  searchParams: Record<string, string | undefined>,
  permissions: RolePermissions,
  membership: Membership,
): DashboardFilters {
  const teamDefault =
    permissions.default_team_filter === "user_teams" && membership.team_ids.length === 1
      ? membership.team_ids[0]
      : null
  const categoryDefault =
    permissions.default_category_filter === "user_categories" && membership.category_ids.length === 1
      ? membership.category_ids[0]
      : null

  return {
    organizationId: session.organizationId,
    membershipId: session.membershipId,
    userId: session.userId,
    dateMode: searchParams.modo === "created_at" ? "created_at" : "due_date",
    from: searchParams.desde,
    to: searchParams.hasta,
    teamId: parseTeamFilter(searchParams.equipo) ?? teamDefault,
    categoryId: parseCategoryFilter(searchParams.categoria) ?? categoryDefault,
    projectFilter: parseProjectFilter(searchParams.proyecto),
    globalFilter: parseGlobalFilter(searchParams.globales),
    status: parseStatus(searchParams.estado),
    priority: parsePriority(searchParams.prioridad),
    sourceType: parseSourceType(searchParams.origen),
    ownerPeopleId: searchParams.responsable ?? null,
  }
}

function parseTeamFilter(value?: string): string | "none" | null {
  if (!value || value === "todos") return null
  if (value === "sin_equipo") return "none"
  return value
}

function parseCategoryFilter(value?: string): string | "none" | null {
  if (!value || value === "todos") return null
  if (value === "sin_categoria") return "none"
  return value
}

function parseProjectFilter(value?: string): string | "none" | null {
  if (!value || value === "todos") return null
  if (value === "ninguno") return "none"
  return value
}

function parseGlobalFilter(value?: string): DashboardFilters["globalFilter"] {
  if (value === "solo_globales") return "global_only"
  if (value === "sin_globales") return "exclude_global"
  return "all"
}

function parseStatus(value?: string): DashboardFilters["status"] {
  if (value === "abiertas" || value === "open") return "open"
  const allowed = ["pending", "in_progress", "blocked", "done", "cancelled"] as const
  return allowed.includes(value as (typeof allowed)[number]) ? (value as DashboardFilters["status"]) : null
}

function parsePriority(value?: string): DashboardFilters["priority"] {
  const allowed = ["low", "normal", "high", "urgent"] as const
  return allowed.includes(value as (typeof allowed)[number]) ? (value as DashboardFilters["priority"]) : null
}

function parseSourceType(value?: string): DashboardFilters["sourceType"] {
  const allowed = ["whatsapp", "meeting", "manual"] as const
  return allowed.includes(value as (typeof allowed)[number]) ? (value as DashboardFilters["sourceType"]) : null
}

export function applyTaskVisibility(
  tasks: Task[],
  scope: TasksScope,
  membership: Membership,
  people: Person[],
  canViewGlobalTasks: boolean,
): Task[] {
  const peopleIdsForUser = people.filter((p) => p.user_id === membership.user_id).map((p) => p.id)

  return tasks.filter((task) => {
    if (task.is_global && !canViewGlobalTasks) return false

    if (scope === "all") return true

    if (scope === "team") {
      const inTeam = task.team_id != null && membership.team_ids.includes(task.team_id)
      const globalOk = task.is_global && canViewGlobalTasks
      return inTeam || globalOk
    }

    const owned =
      (task.owner_people_id != null && peopleIdsForUser.includes(task.owner_people_id)) ||
      (task.owner_user_id != null && task.owner_user_id === membership.user_id)
    const globalOk = task.is_global && canViewGlobalTasks
    return owned || globalOk
  })
}

export function applyDashboardFilters(tasks: Task[], filters: DashboardFilters, range: DateRange | null): Task[] {
  return tasks.filter((task) => {
    if (!taskInRange(task, range, filters.dateMode)) return false
    if (filters.teamId === "none" && task.team_id != null) return false
    if (filters.teamId && filters.teamId !== "none" && task.team_id !== filters.teamId) return false
    if (filters.categoryId === "none" && task.category_id != null) return false
    if (filters.categoryId && filters.categoryId !== "none" && task.category_id !== filters.categoryId) {
      return false
    }
    if (filters.projectFilter === "none" && task.project_id != null) return false
    if (filters.projectFilter && filters.projectFilter !== "none" && task.project_id !== filters.projectFilter) {
      return false
    }
    if (filters.globalFilter === "global_only" && !task.is_global) return false
    if (filters.globalFilter === "exclude_global" && task.is_global) return false
    if (filters.status === "open" && !isOpen(task)) return false
    if (filters.status && filters.status !== "open" && task.status !== filters.status) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.sourceType && task.source_type !== filters.sourceType) return false
    if (filters.ownerPeopleId && task.owner_people_id !== filters.ownerPeopleId) return false
    return true
  })
}
