import { Sidebar, MobileNav, type SidebarUser } from "@/components/sidebar"
import { getSessionContext } from "@/lib/data"
import { createSupabaseClient } from "@/lib/supabase/client"
import { USE_SUPABASE } from "@/lib/data-source"
import { buildMobileNav, buildNavItems } from "@/lib/nav"
import * as mock from "@/lib/mock-data"

export const dynamic = "force-dynamic"

type SidebarContext = {
  user: SidebarUser
  navItems: ReturnType<typeof buildNavItems>
  mobileNav: ReturnType<typeof buildMobileNav>
}

async function loadSidebarContext(): Promise<SidebarContext> {
  try {
    const session = await getSessionContext()
    let orgName = mock.organization.name

    if (USE_SUPABASE) {
      const supabase = createSupabaseClient()
      const orgRes = await supabase
        .from("organizations")
        .select("name")
        .eq("id", session.organizationId)
        .single()
      orgName = orgRes.data?.name ?? orgName
    }

    const navItems = buildNavItems(session.permissions, session.membership, session.features)
    const mobileNav = buildMobileNav(session.permissions, session.membership, session.features)

    return {
      user: {
        displayName: session.user.display_name,
        title: session.membership.title,
        orgName,
        isDemo: session.isDemo,
      },
      navItems,
      mobileNav,
    }
  } catch {
    const fallbackNav = buildNavItems(
      { dashboard_sections: ["summary", "tasks", "team"], tasks_scope: "all", can_manage_users: false, can_manage_settings: false, can_view_global_tasks: true, can_create_global_tasks: false, default_team_filter: "all", default_category_filter: "all", default_project_filter: "all" },
      { id: "", organization_id: "", user_id: "", role: "member", status: "active", title: null, team_ids: [], category_ids: [], joined_at: null, tasks_scope_override: null },
      { whatsapp_capture: true, meeting_memory: true, reminders: true, calendar_view: true, team_load_view: true, assigned_tasks_view: true, team_category_filters: true, project_filters: true, standalone_tasks: true, global_tasks: true, projects: true, beneficiary_tracking: false },
    )
    return {
      user: {
        displayName: "Usuario",
        title: "Sin conexión",
        orgName: "Halketon",
        isDemo: true,
      },
      navItems: fallbackNav,
      mobileNav: buildMobileNav(
        { dashboard_sections: ["summary", "tasks", "team"], tasks_scope: "all", can_manage_users: false, can_manage_settings: false, can_view_global_tasks: true, can_create_global_tasks: false, default_team_filter: "all", default_category_filter: "all", default_project_filter: "all" },
        { id: "", organization_id: "", user_id: "", role: "member", status: "active", title: null, team_ids: [], category_ids: [], joined_at: null, tasks_scope_override: null },
        { whatsapp_capture: true, meeting_memory: true, reminders: true, calendar_view: true, team_load_view: true, assigned_tasks_view: true, team_category_filters: true, project_filters: true, standalone_tasks: true, global_tasks: true, projects: true, beneficiary_tracking: false },
      ),
    }
  }
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user: sidebarUser, navItems, mobileNav } = await loadSidebarContext()

  return (
    <div className="flex min-h-screen">
      <Sidebar user={sidebarUser} navItems={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav navItems={mobileNav} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
