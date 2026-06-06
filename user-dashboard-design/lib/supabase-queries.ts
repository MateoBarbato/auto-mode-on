import "server-only"
import type {
  Organization,
  Team,
  Category,
  User,
  Membership,
  Project,
  Task,
  Person,
  Meeting,
  Reminder,
  InboundMessage,
  OrgOverview,
  UserProfile,
  ProjectDetail,
  GeneralTasksView,
  TaskStatus,
  TaskPriority,
  TaskSourceType,
  ProjectStatus,
  MemberRole,
  MembershipStatus,
  OrgStatus,
  TasksScope,
  DashboardFilters,
  TaskWithRefs,
} from "@/lib/types"
import type { DateRange } from "@/lib/date-ranges"
import {
  type OrgDataset,
  buildOrgOverview,
  buildAllProfiles,
  buildProfile,
  buildProjectDetail,
  buildStandaloneTasks,
  buildGlobalTasks,
  buildGeneralTasks,
  buildTeamHierarchy,
  buildTaskListView,
} from "@/lib/aggregations"
import { createSupabaseClient, resolveOrgId } from "@/lib/supabase/client"
import { getSessionContext } from "@/lib/session"
import { parseDashboardFilters } from "@/lib/filters"
import { parseOrgFeatures } from "@/lib/permissions"

type DbOrganization = {
  id: string
  name: string
  slug: string
  status: OrgStatus
  created_at: string
}

type DbTeam = {
  id: string
  organization_id: string
  name: string
  slug: string
  description: string | null
  color: string | null
}

type DbCategory = {
  id: string
  organization_id: string
  name: string
  slug: string
  color: string | null
}

type DbUser = {
  id: string
  email: string
  display_name: string
  phone: string | null
  created_at: string
}

type DbMembership = {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  status: MembershipStatus
  joined_at: string | null
  tasks_scope_override: TasksScope | null
}

type DbPerson = {
  id: string
  organization_id: string
  display_name: string
  user_id: string | null
  role_label: string | null
}

type DbProject = {
  id: string
  organization_id: string
  team_id: string | null
  name: string
  slug: string
  description: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  created_at: string
}

type DbTask = {
  id: string
  organization_id: string
  project_id: string | null
  is_global: boolean
  team_id: string | null
  category_id: string | null
  owner_id: string | null
  owner_name: string | null
  task_title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  priority: TaskPriority
  source_type: TaskSourceType | null
  confidence: number | null
  created_at: string
  updated_at: string
}

let cachedDataset: OrgDataset | null = null
let cachedOrgId: string | null = null

function indexBy<T extends string>(rows: { key: string; value: T }[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const { key, value } of rows) {
    const list = map.get(key) ?? []
    list.push(value)
    map.set(key, list)
  }
  return map
}

function mapTask(row: DbTask, peopleById: Map<string, DbPerson>): Task {
  const person = row.owner_id ? peopleById.get(row.owner_id) : undefined
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    is_global: row.is_global,
    team_id: row.team_id,
    category_id: row.category_id,
    owner_people_id: row.owner_id,
    owner_user_id: person?.user_id ?? null,
    owner_name: row.owner_name,
    task_title: row.task_title,
    description: row.description,
    due_date: row.due_date,
    status: row.status,
    priority: row.priority,
    source_type: row.source_type,
    confidence: row.confidence,
    created_at: row.created_at,
    completed_at: row.status === "done" ? row.updated_at : null,
  }
}

async function fetchOrgDataset(orgId?: string): Promise<OrgDataset> {
  const supabase = createSupabaseClient()
  const resolvedOrgId = orgId ?? (await resolveOrgId(supabase))

  if (cachedDataset && cachedOrgId === resolvedOrgId) return cachedDataset

  const orgRes = await supabase
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .eq("id", resolvedOrgId)
    .single()

  if (orgRes.error || !orgRes.data) {
    throw new Error(`Error al leer organización: ${orgRes.error?.message ?? "sin datos"}`)
  }

  const [teamsRes, categoriesRes, projectsRes, tasksRes, membershipsRes, peopleRes, meetingsRes, inboundRes] =
    await Promise.all([
      supabase.from("teams").select("id, organization_id, name, slug, description, color").eq("organization_id", resolvedOrgId),
      supabase.from("categories").select("id, organization_id, name, slug, color").eq("organization_id", resolvedOrgId),
      supabase
        .from("projects")
        .select("id, organization_id, team_id, name, slug, description, status, start_date, end_date, created_at")
        .eq("organization_id", resolvedOrgId),
      supabase
        .from("tasks")
        .select(
          "id, organization_id, project_id, is_global, team_id, category_id, owner_id, owner_name, task_title, description, due_date, status, priority, source_type, confidence, created_at, updated_at",
        )
        .eq("organization_id", resolvedOrgId),
      supabase
        .from("organization_memberships")
        .select("id, organization_id, user_id, role, status, joined_at, tasks_scope_override")
        .eq("organization_id", resolvedOrgId)
        .eq("status", "active"),
      supabase
        .from("people")
        .select("id, organization_id, display_name, user_id, role_label")
        .eq("organization_id", resolvedOrgId),
      supabase
        .from("meetings")
        .select("id, organization_id, project_id, title, summary, created_at")
        .eq("organization_id", resolvedOrgId),
      supabase
        .from("inbound_messages")
        .select("id, organization_id, sender_name, body, received_at")
        .eq("organization_id", resolvedOrgId),
    ])

  const baseErrors = [
    teamsRes.error,
    categoriesRes.error,
    projectsRes.error,
    tasksRes.error,
    membershipsRes.error,
    peopleRes.error,
    meetingsRes.error,
    inboundRes.error,
  ].filter(Boolean)

  if (baseErrors.length > 0) {
    throw new Error(
      `Error al leer Supabase: ${baseErrors.map((e) => e?.message ?? "desconocido").join("; ")}`,
    )
  }

  const memberships = (membershipsRes.data ?? []) as DbMembership[]
  const membershipIds = memberships.map((m) => m.id)
  const projectIds = ((projectsRes.data ?? []) as DbProject[]).map((p) => p.id)
  const taskIds = ((tasksRes.data ?? []) as DbTask[]).map((t) => t.id)
  const meetingIds = (meetingsRes.data ?? []).map((m) => m.id as string)
  const userIds = [...new Set(memberships.map((m) => m.user_id))]

  const [membershipTeamsRes, membershipCategoriesRes, projectCategoriesRes, usersRes, meetingTasksRes, remindersRes] =
    await Promise.all([
      membershipIds.length > 0
        ? supabase.from("membership_teams").select("membership_id, team_id").in("membership_id", membershipIds)
        : Promise.resolve({ data: [], error: null }),
      membershipIds.length > 0
        ? supabase.from("membership_categories").select("membership_id, category_id").in("membership_id", membershipIds)
        : Promise.resolve({ data: [], error: null }),
      projectIds.length > 0
        ? supabase.from("project_categories").select("project_id, category_id").in("project_id", projectIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length > 0
        ? supabase.from("users").select("id, email, display_name, phone, created_at").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      meetingIds.length > 0
        ? supabase.from("meeting_tasks").select("meeting_id, task_id").in("meeting_id", meetingIds)
        : Promise.resolve({ data: [], error: null }),
      taskIds.length > 0
        ? supabase.from("reminders").select("id, task_id, scheduled_at, sent_at").in("task_id", taskIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  const joinErrors = [
    membershipTeamsRes.error,
    membershipCategoriesRes.error,
    projectCategoriesRes.error,
    usersRes.error,
    meetingTasksRes.error,
    remindersRes.error,
  ].filter(Boolean)

  if (joinErrors.length > 0) {
    throw new Error(
      `Error al leer relaciones: ${joinErrors.map((e) => e?.message ?? "desconocido").join("; ")}`,
    )
  }

  const orgRow = orgRes.data as DbOrganization
  const peopleRows = (peopleRes.data ?? []) as DbPerson[]
  const peopleById = new Map(peopleRows.map((p) => [p.id, p]))
  const titleByUserId = new Map(
    peopleRows
      .filter((p): p is DbPerson & { user_id: string } => p.user_id !== null)
      .map((p) => [p.user_id, p.role_label]),
  )
  const tasksMapped = ((tasksRes.data ?? []) as DbTask[]).map((t) => mapTask(t, peopleById))
  const tasksById = new Map(tasksMapped.map((t) => [t.id, t]))

  const teamIdsByMembership = indexBy(
    (membershipTeamsRes.data ?? []).map((row) => ({
      key: row.membership_id as string,
      value: row.team_id as string,
    })),
  )
  const categoryIdsByMembership = indexBy(
    (membershipCategoriesRes.data ?? []).map((row) => ({
      key: row.membership_id as string,
      value: row.category_id as string,
    })),
  )
  const categoryIdsByProject = indexBy(
    (projectCategoriesRes.data ?? []).map((row) => ({
      key: row.project_id as string,
      value: row.category_id as string,
    })),
  )
  const tasksByMeeting = indexBy(
    (meetingTasksRes.data ?? []).map((row) => ({
      key: row.meeting_id as string,
      value: row.task_id as string,
    })),
  )

  const organization: Organization = {
    id: orgRow.id,
    name: orgRow.name,
    slug: orgRow.slug,
    status: orgRow.status,
    created_at: orgRow.created_at,
  }

  const teams: Team[] = ((teamsRes.data ?? []) as DbTeam[]).map((t) => ({
    id: t.id,
    organization_id: t.organization_id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    color: t.color,
  }))

  const categories: Category[] = ((categoriesRes.data ?? []) as DbCategory[]).map((c) => ({
    id: c.id,
    organization_id: c.organization_id,
    name: c.name,
    slug: c.slug,
    color: c.color,
  }))

  const users: User[] = ((usersRes.data ?? []) as DbUser[]).map((u) => ({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    phone: u.phone,
    created_at: u.created_at,
  }))

  const people: Person[] = peopleRows.map((p) => ({
    id: p.id,
    organization_id: p.organization_id,
    display_name: p.display_name,
    user_id: p.user_id,
    role_label: p.role_label,
  }))

  const membershipsMapped: Membership[] = memberships.map((m) => ({
    id: m.id,
    organization_id: m.organization_id,
    user_id: m.user_id,
    role: m.role,
    status: m.status,
    title: titleByUserId.get(m.user_id) ?? null,
    team_ids: teamIdsByMembership.get(m.id) ?? [],
    category_ids: categoryIdsByMembership.get(m.id) ?? [],
    joined_at: m.joined_at,
    tasks_scope_override: m.tasks_scope_override,
  }))

  const projects: Project[] = ((projectsRes.data ?? []) as DbProject[]).map((p) => ({
    id: p.id,
    organization_id: p.organization_id,
    team_id: p.team_id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    status: p.status,
    start_date: p.start_date,
    end_date: p.end_date,
    category_ids: categoryIdsByProject.get(p.id) ?? [],
    created_at: p.created_at,
  }))

  const meetings: Meeting[] = (meetingsRes.data ?? []).map((m) => ({
    id: m.id as string,
    organization_id: m.organization_id as string,
    project_id: m.project_id as string | null,
    title: m.title as string,
    summary: m.summary as string | null,
    created_at: m.created_at as string,
    linked_task_ids: tasksByMeeting.get(m.id as string) ?? [],
  }))

  const reminders: Reminder[] = (remindersRes.data ?? []).map((r) => {
    const task = tasksById.get(r.task_id as string)
    return {
      id: r.id as string,
      task_id: r.task_id as string,
      task_title: task?.task_title ?? "Tarea",
      owner_label: task ? task.owner_name : null,
      scheduled_at: r.scheduled_at as string,
      sent_at: r.sent_at as string | null,
    }
  })

  const inboundMessages: InboundMessage[] = (inboundRes.data ?? []).map((m) => ({
    id: m.id as string,
    organization_id: m.organization_id as string,
    sender_name: m.sender_name as string | null,
    body: m.body as string | null,
    received_at: m.received_at as string,
  }))

  cachedOrgId = resolvedOrgId
  cachedDataset = {
    organization,
    teams,
    categories,
    projects,
    memberships: membershipsMapped,
    users,
    people,
    tasks: tasksMapped,
    meetings,
    reminders,
    inboundMessages,
  }
  return cachedDataset
}

async function loadDashboardContext(
  range: DateRange | null,
  searchParams: Record<string, string | undefined>,
) {
  const session = await getSessionContext()
  const dataset = await fetchOrgDataset(session.organizationId)
  let filters = parseDashboardFilters(session, searchParams, session.permissions, session.membership)
  if (searchParams.vista === "mias") {
    const peopleId = dataset.people.find((p) => p.user_id === session.userId)?.id ?? null
    filters = { ...filters, ownerPeopleId: peopleId ?? "__none__" }
  }
  return { dataset, session, filters, range }
}

export async function getOrgOverviewFromSupabase(
  range: DateRange | null,
  searchParams: Record<string, string | undefined> = {},
): Promise<OrgOverview> {
  const { dataset, session, filters } = await loadDashboardContext(range, searchParams)
  return buildOrgOverview(dataset, session, session.features, filters, range)
}

export async function getPeopleFromSupabase(): Promise<UserProfile[]> {
  const session = await getSessionContext()
  const dataset = await fetchOrgDataset(session.organizationId)
  return buildAllProfiles(dataset)
}

export async function getUserProfileFromSupabase(
  userId: string,
  range: DateRange | null,
): Promise<UserProfile | null> {
  const session = await getSessionContext()
  const dataset = await fetchOrgDataset(session.organizationId)
  const membership = dataset.memberships.find((m) => m.user_id === userId)
  const user = dataset.users.find((u) => u.id === userId)
  if (!membership || !user) return null
  return buildProfile(user, membership, dataset.tasks, dataset.teams, dataset.categories, dataset.people, range)
}

export async function getProjectDetailFromSupabase(
  slug: string,
  range: DateRange | null,
): Promise<ProjectDetail | null> {
  const session = await getSessionContext()
  const dataset = await fetchOrgDataset(session.organizationId)
  return buildProjectDetail(dataset, slug, range)
}

export async function getStandaloneTasksFromSupabase(range: DateRange | null): Promise<GeneralTasksView> {
  const session = await getSessionContext()
  const dataset = await fetchOrgDataset(session.organizationId)
  return buildStandaloneTasks(dataset, session, range)
}

export async function getGlobalTasksFromSupabase(range: DateRange | null): Promise<GeneralTasksView> {
  const session = await getSessionContext()
  const dataset = await fetchOrgDataset(session.organizationId)
  return buildGlobalTasks(dataset, session, range)
}

/** @deprecated Use getStandaloneTasksFromSupabase */
export async function getGeneralTasksFromSupabase(range: DateRange | null): Promise<GeneralTasksView> {
  return getStandaloneTasksFromSupabase(range)
}

export async function getTeamHierarchyFromSupabase(range: DateRange | null) {
  const session = await getSessionContext()
  const dataset = await fetchOrgDataset(session.organizationId)
  return buildTeamHierarchy(dataset, session, range)
}

export async function getTaskListFromSupabase(
  range: DateRange | null,
  searchParams: Record<string, string | undefined>,
): Promise<{ pendingTasks: TaskWithRefs[]; completedTasks: TaskWithRefs[]; stats: GeneralTasksView["stats"] }> {
  const { dataset, session, filters } = await loadDashboardContext(range, searchParams)
  return buildTaskListView(dataset, session, filters, range)
}
