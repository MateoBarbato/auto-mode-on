import type {
  MemberRole,
  Membership,
  OrgFeatures,
  RolePermissions,
  SessionContext,
  TasksScope,
} from "@/lib/types"

const DEFAULT_FEATURES: OrgFeatures = {
  whatsapp_capture: true,
  meeting_memory: true,
  reminders: true,
  calendar_view: true,
  team_load_view: true,
  assigned_tasks_view: true,
  team_category_filters: true,
  project_filters: true,
  standalone_tasks: true,
  global_tasks: true,
  projects: true,
  beneficiary_tracking: false,
}

const DEFAULT_ROLE_PERMISSIONS: Record<MemberRole, RolePermissions> = {
  owner: {
    dashboard_sections: ["summary", "global_tasks", "tasks", "projects", "calendar", "meetings", "team", "settings", "users"],
    tasks_scope: "all",
    can_manage_users: true,
    can_manage_settings: true,
    can_view_global_tasks: true,
    can_create_global_tasks: true,
    default_team_filter: "all",
    default_category_filter: "all",
    default_project_filter: "all",
  },
  admin: {
    dashboard_sections: ["summary", "global_tasks", "tasks", "projects", "calendar", "meetings", "team", "settings", "users"],
    tasks_scope: "all",
    can_manage_users: true,
    can_manage_settings: true,
    can_view_global_tasks: true,
    can_create_global_tasks: true,
    default_team_filter: "all",
    default_category_filter: "all",
    default_project_filter: "all",
  },
  manager: {
    dashboard_sections: ["summary", "global_tasks", "tasks", "projects", "calendar", "team"],
    tasks_scope: "team",
    can_manage_users: false,
    can_manage_settings: false,
    can_view_global_tasks: true,
    can_create_global_tasks: false,
    default_team_filter: "user_teams",
    default_category_filter: "user_categories",
    default_project_filter: "all",
  },
  member: {
    dashboard_sections: ["global_tasks", "tasks", "calendar"],
    tasks_scope: "assigned",
    can_manage_users: false,
    can_manage_settings: false,
    can_view_global_tasks: true,
    can_create_global_tasks: false,
    default_team_filter: "user_teams",
    default_category_filter: "user_categories",
    default_project_filter: "assigned_projects",
  },
}

export function parseOrgFeatures(raw: Record<string, unknown> | null | undefined): OrgFeatures {
  return { ...DEFAULT_FEATURES, ...(raw as Partial<OrgFeatures> | undefined) }
}

export function resolveRolePermissions(
  role: MemberRole,
  raw: Record<string, unknown> | null | undefined,
): RolePermissions {
  const roleBlock = (raw?.[role] as Partial<RolePermissions> | undefined) ?? {}
  return { ...DEFAULT_ROLE_PERMISSIONS[role], ...roleBlock }
}

export function effectiveDashboardSections(
  membership: Membership,
  permissions: RolePermissions,
): string[] {
  return membership.dashboard_sections_override ?? permissions.dashboard_sections
}

export function effectiveTasksScope(membership: Membership, permissions: RolePermissions): TasksScope {
  return membership.tasks_scope_override ?? permissions.tasks_scope
}

export function canAccessSection(permissions: RolePermissions, section: string, membership?: Membership): boolean {
  const sections = membership
    ? effectiveDashboardSections(membership, permissions)
    : permissions.dashboard_sections
  return sections.includes(section)
}

export function canManageUsers(session: SessionContext): boolean {
  return session.permissions.can_manage_users && canAccessSection(session.permissions, "users", session.membership)
}
