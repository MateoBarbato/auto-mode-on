// Domain types modeled on the Halketon NGO task-management schema.

export type OrgStatus = "active" | "suspended"
export type MemberRole = "owner" | "admin" | "manager" | "member"
export type MembershipStatus = "pending" | "active" | "suspended"
export type TaskStatus = "pending" | "in_progress" | "blocked" | "done" | "cancelled"
export type TaskPriority = "low" | "normal" | "high" | "urgent"
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived"

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
  avatar_url: string | null
  created_at: string
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
  owner_id: string | null
  task_title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  priority: TaskPriority
  created_at: string
  completed_at: string | null
}

// Aggregated shapes used by the UI layer.

export interface TaskWithRefs extends Task {
  ownerName: string | null
  ownerAvatar: string | null
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
}
