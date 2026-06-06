import "server-only"
import type { Category, Invitation, MemberRole, OrgMemberRow, Team } from "@/lib/types"
import { createSupabaseClient } from "@/lib/supabase/client"
import { getSessionContext } from "@/lib/session"
import { USE_SUPABASE } from "@/lib/data-source"
import * as mock from "@/lib/mock-data"

function indexBy<T extends string>(rows: { key: string; value: T }[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const { key, value } of rows) {
    const list = map.get(key) ?? []
    list.push(value)
    map.set(key, list)
  }
  return map
}

export async function getOrgMembers(): Promise<OrgMemberRow[]> {
  if (!USE_SUPABASE) {
    return mock.memberships.map((membership) => {
      const user = mock.users.find((u) => u.id === membership.user_id)!
      return {
        membership,
        user,
        teams: mock.teams.filter((t) => membership.team_ids.includes(t.id)),
        categories: mock.categories.filter((c) => membership.category_ids.includes(c.id)),
        personLink: mock.people.find((p) => p.user_id === user.id) ?? null,
      }
    })
  }

  const session = await getSessionContext()
  const supabase = createSupabaseClient()
  const orgId = session.organizationId

  const [membershipsRes, usersRes, teamsRes, categoriesRes, peopleRes, mtRes, mcRes] =
    await Promise.all([
      supabase
        .from("organization_memberships")
        .select(
          "id, organization_id, user_id, role, status, joined_at, tasks_scope_override, dashboard_sections_override, primary_team_id, primary_category_id",
        )
        .eq("organization_id", orgId)
        .order("joined_at", { ascending: false }),
      supabase.from("users").select("id, email, display_name, phone, notification_email, email_notifications_enabled, created_at"),
      supabase.from("teams").select("id, organization_id, name, slug, description, color").eq("organization_id", orgId),
      supabase.from("categories").select("id, organization_id, name, slug, color").eq("organization_id", orgId),
      supabase.from("people").select("id, organization_id, display_name, user_id, role_label").eq("organization_id", orgId),
      supabase.from("membership_teams").select("membership_id, team_id"),
      supabase.from("membership_categories").select("membership_id, category_id"),
    ])

  const userIds = new Set((membershipsRes.data ?? []).map((m) => m.user_id as string))
  const usersById = new Map(
    ((usersRes.data ?? []) as Array<{ id: string; email: string; display_name: string; phone: string | null; notification_email: string | null; email_notifications_enabled: boolean; created_at: string }>)
      .filter((u) => userIds.has(u.id))
      .map((u) => [u.id, u]),
  )
  const teamsById = new Map(((teamsRes.data ?? []) as Team[]).map((t) => [t.id, t]))
  const categoriesById = new Map(((categoriesRes.data ?? []) as Category[]).map((c) => [c.id, c]))
  const peopleByUserId = new Map(
    (peopleRes.data ?? [])
      .filter((p) => p.user_id)
      .map((p) => [p.user_id as string, p]),
  )
  const teamIdsByMembership = indexBy(
    (mtRes.data ?? []).map((r) => ({ key: r.membership_id as string, value: r.team_id as string })),
  )
  const categoryIdsByMembership = indexBy(
    (mcRes.data ?? []).map((r) => ({ key: r.membership_id as string, value: r.category_id as string })),
  )

  const rows: OrgMemberRow[] = []
  for (const m of membershipsRes.data ?? []) {
    const user = usersById.get(m.user_id as string)
    if (!user) continue
    const teamIds = teamIdsByMembership.get(m.id as string) ?? []
    const categoryIds = categoryIdsByMembership.get(m.id as string) ?? []
    rows.push({
      membership: {
        id: m.id as string,
        organization_id: m.organization_id as string,
        user_id: m.user_id as string,
        role: m.role as OrgMemberRow["membership"]["role"],
        status: m.status as OrgMemberRow["membership"]["status"],
        title: peopleByUserId.get(m.user_id as string)?.role_label ?? null,
        team_ids: teamIds,
        category_ids: categoryIds,
        joined_at: m.joined_at as string | null,
        tasks_scope_override: m.tasks_scope_override as OrgMemberRow["membership"]["tasks_scope_override"],
        dashboard_sections_override: (m.dashboard_sections_override as string[] | null) ?? null,
        primary_team_id: m.primary_team_id as string | null,
        primary_category_id: m.primary_category_id as string | null,
      },
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone,
        notification_email: user.notification_email,
        email_notifications_enabled: user.email_notifications_enabled,
        created_at: user.created_at,
      },
      teams: teamIds.map((id) => teamsById.get(id)).filter((t): t is Team => Boolean(t)),
      categories: categoryIds.map((id) => categoriesById.get(id)).filter((c): c is Category => Boolean(c)),
      personLink: peopleByUserId.get(m.user_id as string) ?? null,
    })
  }
  return rows
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  if (!USE_SUPABASE) {
    return [
      {
        id: "inv_demo",
        organization_id: mock.organization.id,
        email: "nuevo@halketon.org",
        role: "member",
        token: "demo-invite-token-halketon",
        invited_by: mock.users[0].id,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        team_ids: ["team_outreach"],
        category_ids: ["cat_education"],
      },
    ]
  }

  const session = await getSessionContext()
  const supabase = createSupabaseClient()

  const [invRes, itRes, icRes] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, organization_id, email, role, token, invited_by, status, expires_at, created_at")
      .eq("organization_id", session.organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("invitation_teams").select("invitation_id, team_id"),
    supabase.from("invitation_categories").select("invitation_id, category_id"),
  ])

  const teamsByInvitation = indexBy(
    (itRes.data ?? []).map((r) => ({ key: r.invitation_id as string, value: r.team_id as string })),
  )
  const categoriesByInvitation = indexBy(
    (icRes.data ?? []).map((r) => ({ key: r.invitation_id as string, value: r.category_id as string })),
  )

  return (invRes.data ?? []).map((inv) => ({
    id: inv.id as string,
    organization_id: inv.organization_id as string,
    email: inv.email as string,
    role: inv.role as MemberRole,
    token: inv.token as string,
    invited_by: inv.invited_by as string | null,
    status: inv.status as Invitation["status"],
    expires_at: inv.expires_at as string,
    created_at: inv.created_at as string,
    team_ids: teamsByInvitation.get(inv.id as string) ?? [],
    category_ids: categoriesByInvitation.get(inv.id as string) ?? [],
  }))
}

export async function getInvitationByToken(token: string): Promise<(Invitation & { orgName: string }) | null> {
  if (!USE_SUPABASE) {
    if (token !== "demo-invite-token-halketon") return null
    return {
      id: "inv_demo",
      organization_id: mock.organization.id,
      orgName: mock.organization.name,
      email: "nuevo@halketon.org",
      role: "member",
      token,
      invited_by: mock.users[0].id,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      team_ids: ["team_outreach"],
      category_ids: ["cat_education"],
    }
  }

  const supabase = createSupabaseClient()
  const invRes = await supabase
    .from("invitations")
    .select("id, organization_id, email, role, token, invited_by, status, expires_at, created_at")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle()

  if (!invRes.data) return null

  const orgRes = await supabase
    .from("organizations")
    .select("name")
    .eq("id", invRes.data.organization_id as string)
    .single()

  const [itRes, icRes] = await Promise.all([
    supabase.from("invitation_teams").select("team_id").eq("invitation_id", invRes.data.id as string),
    supabase.from("invitation_categories").select("category_id").eq("invitation_id", invRes.data.id as string),
  ])

  return {
    id: invRes.data.id as string,
    organization_id: invRes.data.organization_id as string,
    orgName: orgRes.data?.name ?? "Organización",
    email: invRes.data.email as string,
    role: invRes.data.role as MemberRole,
    token: invRes.data.token as string,
    invited_by: invRes.data.invited_by as string | null,
    status: invRes.data.status as Invitation["status"],
    expires_at: invRes.data.expires_at as string,
    created_at: invRes.data.created_at as string,
    team_ids: (itRes.data ?? []).map((r) => r.team_id as string),
    category_ids: (icRes.data ?? []).map((r) => r.category_id as string),
  }
}

export async function getTeamsAndCategoriesForAdmin() {
  if (!USE_SUPABASE) {
    return { teams: mock.teams, categories: mock.categories }
  }
  const session = await getSessionContext()
  const supabase = createSupabaseClient()
  const [teamsRes, categoriesRes] = await Promise.all([
    supabase.from("teams").select("id, organization_id, name, slug, description, color").eq("organization_id", session.organizationId),
    supabase.from("categories").select("id, organization_id, name, slug, color").eq("organization_id", session.organizationId),
  ])
  return {
    teams: (teamsRes.data ?? []) as Team[],
    categories: (categoriesRes.data ?? []) as Category[],
  }
}
