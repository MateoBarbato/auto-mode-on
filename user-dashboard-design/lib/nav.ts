import type { OrgFeatures, RolePermissions, Membership } from "@/lib/types"
import { canAccessSection, effectiveDashboardSections } from "@/lib/permissions"

export type NavIconName =
  | "layout-dashboard"
  | "users"
  | "list-todo"
  | "folder-kanban"
  | "inbox"
  | "globe"
  | "user-cog"
  | "settings"

export type NavChild = { href: string; label: string; icon: NavIconName; section?: string }
export type NavItem = { href: string; label: string; icon: NavIconName; section: string; children?: NavChild[] }

const ALL_NAV: NavItem[] = [
  { href: "/", label: "Resumen", icon: "layout-dashboard", section: "summary" },
  { href: "/people", label: "Personas", icon: "users", section: "team" },
  {
    href: "/tasks",
    label: "Tareas",
    icon: "list-todo",
    section: "tasks",
    children: [
      { href: "/tasks/projects", label: "Por proyecto", icon: "folder-kanban", section: "projects" },
      { href: "/tasks/global", label: "Globales", icon: "globe", section: "global_tasks" },
      { href: "/tasks/standalone", label: "Sueltas", icon: "inbox", section: "standalone_tasks" },
      { href: "/tasks/equipos", label: "Por equipo", icon: "users", section: "team" },
      { href: "/tasks/mine", label: "Mis tareas", icon: "list-todo", section: "assigned_tasks_view" },
    ],
  },
  { href: "/settings/users", label: "Usuarios", icon: "user-cog", section: "users" },
  { href: "/settings", label: "Configuración", icon: "settings", section: "settings" },
]

export function buildNavItems(
  permissions: RolePermissions,
  membership: Membership,
  features: OrgFeatures,
): NavItem[] {
  const sections = effectiveDashboardSections(membership, permissions)

  return ALL_NAV.filter((item) => sections.includes(item.section))
    .map((item) => {
      if (!item.children) return item
      const children = item.children.filter((child) => {
        if (child.section === "projects") return features.projects && sections.includes("projects")
        if (child.section === "standalone_tasks") return features.standalone_tasks
        if (child.section === "global_tasks") return features.global_tasks && sections.includes("global_tasks")
        if (child.section === "team") return features.team_category_filters && sections.includes("team")
        if (child.section === "assigned_tasks_view") return features.assigned_tasks_view
        return true
      })
      return { ...item, children: children.length > 0 ? children : undefined }
    })
    .filter((item) => item.href !== "/settings/users" || canAccessSection(permissions, "users", membership))
}

export function buildMobileNav(
  permissions: RolePermissions,
  membership: Membership,
  features: OrgFeatures,
): NavChild[] {
  const items = buildNavItems(permissions, membership, features)
  const flat: NavChild[] = []
  for (const item of items) {
    if (item.children?.length) {
      flat.push(...item.children.slice(0, 2))
    } else {
      flat.push({ href: item.href, label: item.label, icon: item.icon })
    }
  }
  return flat.slice(0, 5)
}
