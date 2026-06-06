import "server-only"
import type { OrgOverview, UserProfile, ProjectDetail, GeneralTasksView, TaskWithRefs } from "@/lib/types"
import * as mock from "@/lib/mock-data"
import { resolveRange, type RangePreset } from "@/lib/date-ranges"
import {
  buildOrgOverview,
  buildAllProfiles,
  buildProfile,
  buildProjectDetail,
  buildStandaloneTasks,
  buildGlobalTasks,
  buildGeneralTasks,
  buildTeamHierarchy,
  buildTaskListView,
  isOverdue,
  isOpen,
  type OrgDataset,
} from "@/lib/aggregations"
import { USE_SUPABASE } from "@/lib/data-source"
import { getSessionContext } from "@/lib/session"
import { parseDashboardFilters } from "@/lib/filters"
import { parseOrgFeatures, resolveRolePermissions } from "@/lib/permissions"
import {
  getOrgOverviewFromSupabase,
  getPeopleFromSupabase,
  getUserProfileFromSupabase,
  getProjectDetailFromSupabase,
  getStandaloneTasksFromSupabase,
  getGlobalTasksFromSupabase,
  getGeneralTasksFromSupabase,
  getTeamHierarchyFromSupabase,
  getTaskListFromSupabase,
} from "@/lib/supabase-queries"

export { USE_SUPABASE } from "@/lib/data-source"
export { getSessionContext, clearSessionCache } from "@/lib/session"

export type DataSearchParams = Record<string, string | undefined>

export type OverviewOpts = {
  preset?: RangePreset
  from?: string
  to?: string
  searchParams?: DataSearchParams
}

function mockDataset(): OrgDataset {
  return {
    organization: mock.organization,
    teams: mock.teams,
    categories: mock.categories,
    projects: mock.projects,
    memberships: mock.memberships,
    users: mock.users,
    people: mock.people,
    tasks: mock.tasks,
    meetings: mock.meetings,
    reminders: mock.reminders,
    inboundMessages: mock.inboundMessages,
  }
}

async function mockSession() {
  const membership = mock.memberships[0]
  const user = mock.users[0]
  return {
    organizationId: mock.organization.id,
    membershipId: membership.id,
    userId: user.id,
    role: membership.role,
    user,
    membership,
    permissions: resolveRolePermissions(membership.role, null),
    features: parseOrgFeatures(null),
    isDemo: true,
  }
}

export async function getOrgOverview(opts?: OverviewOpts): Promise<OrgOverview> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  const sp = opts?.searchParams ?? {}
  if (USE_SUPABASE) return getOrgOverviewFromSupabase(range, sp)

  const session = await mockSession()
  const filters = parseDashboardFilters(session, sp, session.permissions, session.membership)
  return buildOrgOverview(mockDataset(), session, session.features, filters, range)
}

export async function getPeople(): Promise<UserProfile[]> {
  if (USE_SUPABASE) return getPeopleFromSupabase()
  return buildAllProfiles(mockDataset())
}

export async function getUserProfile(
  userId: string,
  opts?: { preset?: RangePreset; from?: string; to?: string },
): Promise<UserProfile | null> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) return getUserProfileFromSupabase(userId, range)
  const dataset = mockDataset()
  const membership = dataset.memberships.find((m) => m.user_id === userId)
  const user = dataset.users.find((u) => u.id === userId)
  if (!membership || !user) return null
  return buildProfile(user, membership, dataset.tasks, dataset.teams, dataset.categories, dataset.people, range)
}

export async function getProjectDetail(
  slug: string,
  opts?: { preset?: RangePreset; from?: string; to?: string },
): Promise<ProjectDetail | null> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) return getProjectDetailFromSupabase(slug, range)
  return buildProjectDetail(mockDataset(), slug, range)
}

export async function getStandaloneTasks(opts?: {
  preset?: RangePreset
  from?: string
  to?: string
}): Promise<GeneralTasksView> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) return getStandaloneTasksFromSupabase(range)
  const session = await mockSession()
  return buildStandaloneTasks(mockDataset(), session, range)
}

export async function getGlobalTasks(opts?: {
  preset?: RangePreset
  from?: string
  to?: string
}): Promise<GeneralTasksView> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) return getGlobalTasksFromSupabase(range)
  const session = await mockSession()
  return buildGlobalTasks(mockDataset(), session, range)
}

/** @deprecated Use getStandaloneTasks */
export async function getGeneralTasks(opts?: {
  preset?: RangePreset
  from?: string
  to?: string
}): Promise<GeneralTasksView> {
  return getStandaloneTasks(opts)
}

export async function getTeamHierarchy(opts?: {
  preset?: RangePreset
  from?: string
  to?: string
}) {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  if (USE_SUPABASE) return getTeamHierarchyFromSupabase(range)
  const session = await mockSession()
  return buildTeamHierarchy(mockDataset(), session, range)
}

export async function getTaskList(opts?: OverviewOpts): Promise<{
  pendingTasks: TaskWithRefs[]
  completedTasks: TaskWithRefs[]
  stats: GeneralTasksView["stats"]
}> {
  const range = resolveRange(opts?.preset ?? "todo", opts?.from, opts?.to)
  const sp = opts?.searchParams ?? {}
  if (USE_SUPABASE) return applyListFiltro(await getTaskListFromSupabase(range, sp), sp.filtro)

  const session = await mockSession()
  const filters = applyMineView(parseDashboardFilters(session, sp, session.permissions, session.membership), sp, session)
  return applyListFiltro(buildTaskListView(mockDataset(), session, filters, range), sp.filtro)
}

function applyMineView(
  filters: ReturnType<typeof parseDashboardFilters>,
  sp: DataSearchParams,
  session: Awaited<ReturnType<typeof mockSession>>,
) {
  if (sp.vista !== "mias") return filters
  const peopleIds = mockDataset().people.filter((p) => p.user_id === session.userId).map((p) => p.id)
  return { ...filters, ownerPeopleId: peopleIds[0] ?? "__none__" }
}

function applyListFiltro(
  view: { pendingTasks: TaskWithRefs[]; completedTasks: TaskWithRefs[]; stats: GeneralTasksView["stats"] },
  filtro?: string,
) {
  if (!filtro) return view
  if (filtro === "vencidas") {
    const pending = view.pendingTasks.filter(isOverdue)
    return { ...view, pendingTasks: pending, completedTasks: [], stats: { ...view.stats, pending: pending.length } }
  }
  if (filtro === "sin_responsable") {
    const pending = view.pendingTasks.filter(
      (t) => isOpen(t) && !t.owner_people_id && !t.owner_user_id && !t.owner_name,
    )
    return { ...view, pendingTasks: pending, completedTasks: [], stats: { ...view.stats, pending: pending.length } }
  }
  if (filtro === "owner_no_vinculado") {
    const pending = view.pendingTasks.filter(
      (t) => isOpen(t) && !t.owner_people_id && !t.owner_user_id && Boolean(t.owner_name),
    )
    return { ...view, pendingTasks: pending, completedTasks: [], stats: { ...view.stats, pending: pending.length } }
  }
  if (filtro === "baja_confianza") {
    const pending = view.pendingTasks.filter((t) => t.confidence != null && t.confidence < 0.75)
    return { ...view, pendingTasks: pending, completedTasks: [], stats: { ...view.stats, pending: pending.length } }
  }
  if (filtro === "proximas") {
    const pending = view.pendingTasks
      .filter((t) => isOpen(t) && !isOverdue(t) && t.due_date)
      .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime())
    return { ...view, pendingTasks: pending, completedTasks: [], stats: { ...view.stats, pending: pending.length } }
  }
  if (filtro === "alta_prioridad") {
    const pending = view.pendingTasks.filter(
      (t) => isOpen(t) && (t.priority === "high" || t.priority === "urgent"),
    )
    return { ...view, pendingTasks: pending, completedTasks: [], stats: { ...view.stats, pending: pending.length } }
  }
  return view
}
