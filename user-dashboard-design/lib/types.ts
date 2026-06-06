// Domain types modeled on the Halketon NGO task-management schema.

export type OrgStatus = "active" | "suspended"
export type MemberRole = "owner" | "admin" | "manager" | "member"
export type MembershipStatus = "pending" | "active" | "suspended"
export type TaskStatus = "pending" | "in_progress" | "blocked" | "done" | "cancelled"
export type TaskPriority = "low" | "normal" | "high" | "urgent"
export type TaskSourceType = "whatsapp" | "meeting" | "manual"
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived"
export type TasksScope = "all" | "team" | "assigned"
export type GlobalFilter = "all" | "global_only" | "exclude_global"
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked"

export interface Organization {
  id: string
  name: string
  slug: string
  status: OrgStatus
  created_at: string
}

export interface Team {
  id: string
  organization_id: string
  name: string
  slug: string
  description: string | null
  color: string | null
}

export interface Category {
  id: string
  organization_id: string
  name: string
  slug: string
  color: string | null
}

export interface User {
  id: string
  email: string
  display_name: string
  phone: string | null
  notification_email?: string | null
  email_notifications_enabled?: boolean
  created_at: string
}

export interface Person {
  id: string
  organization_id: string
  display_name: string
  user_id: string | null
  role_label: string | null
}

export interface Membership {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  status: MembershipStatus
  title: string | null
  team_ids: string[]
  category_ids: string[]
  joined_at: string | null
  tasks_scope_override: TasksScope | null
  dashboard_sections_override?: string[] | null
  primary_team_id?: string | null
  primary_category_id?: string | null
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: MemberRole
  token: string
  invited_by: string | null
  status: InvitationStatus
  expires_at: string
  created_at: string
  team_ids: string[]
  category_ids: string[]
}

export interface OrgMemberRow {
  membership: Membership
  user: User
  teams: Team[]
  categories: Category[]
  personLink: Person | null
}

export interface Project {
  id: string
  organization_id: string
  team_id: string | null
  name: string
  slug: string
  description: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  category_ids: string[]
  created_at: string
}

export interface Task {
  id: string
  organization_id: string
  project_id: string | null
  is_global: boolean
  team_id: string | null
  category_id: string | null
  owner_people_id: string | null
  owner_user_id: string | null
  owner_name: string | null
  task_title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  priority: TaskPriority
  source_type: TaskSourceType | null
  confidence: number | null
  created_at: string
  completed_at: string | null
}

export interface Meeting {
  id: string
  organization_id: string
  project_id: string | null
  title: string
  summary: string | null
  created_at: string
  linked_task_ids: string[]
}

export interface Reminder {
  id: string
  task_id: string
  task_title: string
  owner_label: string | null
  scheduled_at: string
  sent_at: string | null
}

export interface InboundMessage {
  id: string
  organization_id: string
  sender_name: string | null
  body: string | null
  received_at: string
}

export interface OrgFeatures {
  whatsapp_capture: boolean
  meeting_memory: boolean
  reminders: boolean
  calendar_view: boolean
  team_load_view: boolean
  assigned_tasks_view: boolean
  team_category_filters: boolean
  project_filters: boolean
  standalone_tasks: boolean
  global_tasks: boolean
  projects: boolean
  beneficiary_tracking: boolean
}

export interface RolePermissions {
  dashboard_sections: string[]
  tasks_scope: TasksScope
  can_manage_users: boolean
  can_manage_settings: boolean
  can_view_global_tasks: boolean
  can_create_global_tasks: boolean
  default_team_filter: string
  default_category_filter: string
  default_project_filter: string
}

export interface SessionContext {
  organizationId: string
  membershipId: string
  userId: string
  role: MemberRole
  user: User
  membership: Membership
  permissions: RolePermissions
  features: OrgFeatures
  isDemo: boolean
}

export interface DashboardFilters {
  organizationId: string
  membershipId: string
  userId: string
  dateMode: "due_date" | "created_at"
  from?: string
  to?: string
  teamId?: string | "none" | null
  categoryId?: string | "none" | null
  projectFilter?: string | "none" | null
  globalFilter?: GlobalFilter
  status?: TaskStatus | "open" | null
  priority?: TaskPriority | null
  sourceType?: TaskSourceType | null
  ownerPeopleId?: string | null
}

export interface DashboardSummary {
  kpis: {
    openTasks: number
    overdueTasks: number
    dueThisWeekTasks: number
    blockedTasks: number
    unownedTasks: number
    unresolvedOwnerTasks: number
    highPriorityOpenTasks: number
    openGlobalTasks: number
    activeProjects: number
    meetingsInRange: number
    pendingReminders: number
    inboundMessagesInRange: number
  }
  charts: {
    dueDateBuckets: Array<{ bucket: string; label: string; count: number }>
    tasksCreatedByDay: Array<{ day: string; count: number }>
    inboundMessagesByDay: Array<{ day: string; count: number }>
    tasksByStatus: Array<{ status: TaskStatus; count: number }>
    tasksByPriority: Array<{ priority: TaskPriority; count: number }>
    tasksBySource: Array<{ sourceType: string; count: number }>
    workloadByOwner: Array<{
      ownerPeopleId: string | null
      ownerLabel: string
      openTasks: number
      overdueTasks: number
      blockedTasks: number
    }>
    tasksByTeamAndStatus: Array<{ teamId?: string; teamName?: string; categoryId?: string; categoryName?: string; status: TaskStatus; count: number }>
    tasksByCategoryAndStatus: Array<{ teamId?: string; teamName?: string; categoryId?: string; categoryName?: string; status: TaskStatus; count: number }>
  }
  lists: {
    overdue: TaskWithRefs[]
    dueSoon: TaskWithRefs[]
    blocked: TaskWithRefs[]
    unowned: TaskWithRefs[]
    lowConfidence: TaskWithRefs[]
    pendingReminders: Reminder[]
    recentMeetings: Meeting[]
  }
}

export interface TaskWithRefs extends Task {
  ownerName: string | null
  ownerId: string | null
  projectName: string | null
  teamName: string | null
}

export interface ProjectDetail {
  project: Project
  team: Team | null
  categories: Category[]
  pendingTasks: TaskWithRefs[]
  completedTasks: TaskWithRefs[]
  stats: {
    total: number
    completed: number
    pending: number
    overdue: number
    completionRate: number
  }
}

export interface GeneralTasksView {
  pendingTasks: TaskWithRefs[]
  completedTasks: TaskWithRefs[]
  stats: {
    total: number
    completed: number
    pending: number
    overdue: number
    completionRate: number
  }
}

export interface UserProfile {
  user: User
  membership: Membership
  teams: Team[]
  categories: Category[]
  completedTasks: Task[]
  upcomingTasks: Task[]
  stats: {
    total: number
    completed: number
    upcoming: number
    overdue: number
    completionRate: number
  }
}

export interface OrgOverview {
  organization: Organization
  memberCount: number
  teams: Team[]
  categories: Category[]
  projects: Project[]
  people: Person[]
  session: SessionContext
  features: OrgFeatures
  stats: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    pendingTasks: number
    blockedTasks: number
    overdueTasks: number
    activeProjects: number
    completedProjects: number
    completionRate: number
  }
  statusBreakdown: { status: TaskStatus; count: number }[]
  teamLoad: { team: Team; open: number; completed: number; members: number }[]
  recentTasks: (Task & { ownerName: string | null; projectName: string | null })[]
  projectProgress: { projectId: string; total: number; completed: number }[]
  summary: DashboardSummary
}
