import "server-only"
import { cookies } from "next/headers"
import type { SessionContext, User, Membership, MemberRole } from "@/lib/types"
import { parseOrgFeatures, resolveRolePermissions } from "@/lib/permissions"
import { createSupabaseClient, resolveOrgId } from "@/lib/supabase/client"
import { createAuthClient } from "@/lib/supabase/server"
import { USE_SUPABASE } from "@/lib/data-source"
import * as mock from "@/lib/mock-data"

let cachedSession: SessionContext | null = null

export function clearSessionCache() {
  cachedSession = null
}

async function loadMembershipDetails(
  supabase: ReturnType<typeof createSupabaseClient>,
  orgId: string,
  userId: string,
  membershipRow: {
    id: string
    organization_id: string
    user_id: string
    role: string
    status: string
    joined_at: string | null
    tasks_scope_override: string | null
    dashboard_sections_override?: string[] | null
    primary_team_id?: string | null
    primary_category_id?: string | null
  },
  rolePermissionsRaw: Record<string, unknown> | undefined,
  featuresRaw: Record<string, unknown> | undefined,
  isDemo: boolean,
): Promise<SessionContext> {
  const membershipId = membershipRow.id

  const [userRes, teamsRes, categoriesRes, personRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, display_name, phone, notification_email, email_notifications_enabled, created_at")
      .eq("id", userId)
      .single(),
    supabase.from("membership_teams").select("team_id").eq("membership_id", membershipId),
    supabase.from("membership_categories").select("category_id").eq("membership_id", membershipId),
    supabase
      .from("people")
      .select("role_label")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ])

  if (userRes.error || !userRes.data) {
    throw new Error("Sesión inválida: usuario no encontrado.")
  }

  const user: User = {
    id: userRes.data.id,
    email: userRes.data.email,
    display_name: userRes.data.display_name,
    phone: userRes.data.phone,
    notification_email: userRes.data.notification_email,
    email_notifications_enabled: userRes.data.email_notifications_enabled,
    created_at: userRes.data.created_at,
  }

  const membership: Membership = {
    id: membershipRow.id,
    organization_id: membershipRow.organization_id,
    user_id: membershipRow.user_id,
    role: membershipRow.role as MemberRole,
    status: membershipRow.status as Membership["status"],
    title: personRes.data?.role_label ?? null,
    team_ids: (teamsRes.data ?? []).map((r) => r.team_id as string),
    category_ids: (categoriesRes.data ?? []).map((r) => r.category_id as string),
    joined_at: membershipRow.joined_at,
    tasks_scope_override: membershipRow.tasks_scope_override as Membership["tasks_scope_override"],
    dashboard_sections_override: membershipRow.dashboard_sections_override ?? null,
    primary_team_id: membershipRow.primary_team_id ?? null,
    primary_category_id: membershipRow.primary_category_id ?? null,
  }

  const permissions = resolveRolePermissions(membership.role, rolePermissionsRaw)
  const features = parseOrgFeatures(featuresRaw)

  return {
    organizationId: orgId,
    membershipId: membership.id,
    userId: user.id,
    role: membership.role,
    user,
    membership,
    permissions,
    features,
    isDemo,
  }
}

export async function getSessionContext(): Promise<SessionContext> {
  if (cachedSession) return cachedSession

  if (!USE_SUPABASE) {
    const membership = mock.memberships[0]
    const user = mock.users[0]
    const permissions = resolveRolePermissions(membership.role, null)
    cachedSession = {
      organizationId: mock.organization.id,
      membershipId: membership.id,
      userId: user.id,
      role: membership.role,
      user,
      membership: { ...membership, tasks_scope_override: null },
      permissions,
      features: parseOrgFeatures(null),
      isDemo: true,
    }
    return cachedSession
  }

  const supabase = createSupabaseClient()
  let userId: string | null = null
  let isDemo = true
  let authUserId: string | null = null

  try {
    const auth = await createAuthClient()
    const { data } = await auth.auth.getUser()
    if (data.user) {
      authUserId = data.user.id
      const linked = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle()
      if (linked.data?.id) {
        userId = linked.data.id
        isDemo = false
      }
    }
  } catch {
    // Auth not configured — fall through to demo user.
  }

  let orgId: string | null = null

  if (userId && !isDemo) {
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get("active_org_id")?.value ?? null

    const membershipsRes = await supabase
      .from("organization_memberships")
      .select(
        "id, organization_id, user_id, role, status, joined_at, tasks_scope_override, dashboard_sections_override, primary_team_id, primary_category_id",
      )
      .eq("user_id", userId)
      .eq("status", "active")

    const memberships = membershipsRes.data ?? []
    if (memberships.length === 0) {
      throw new Error("Sesión inválida: usuario sin membresía activa.")
    }

    const chosen =
      (activeOrgId ? memberships.find((m) => m.organization_id === activeOrgId) : null) ??
      memberships[0]

    orgId = chosen.organization_id as string

    const settingsRes = await supabase
      .from("organization_settings")
      .select("features, role_permissions")
      .eq("organization_id", orgId)
      .single()

    cachedSession = await loadMembershipDetails(
      supabase,
      orgId,
      userId,
      chosen,
      settingsRes.data?.role_permissions as Record<string, unknown> | undefined,
      settingsRes.data?.features as Record<string, unknown> | undefined,
      false,
    )
    return cachedSession
  }

  orgId = await resolveOrgId(supabase)

  if (!userId) {
    userId = process.env.DEMO_USER_ID ?? null
    if (!userId) {
      const ownerRes = await supabase
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("role", "owner")
        .eq("status", "active")
        .limit(1)
        .single()
      userId = ownerRes.data?.user_id ?? null
    }
  }

  if (!userId) {
    throw new Error("No se pudo resolver el usuario de sesión para el dashboard.")
  }

  const settingsRes = await supabase
    .from("organization_settings")
    .select("features, role_permissions")
    .eq("organization_id", orgId)
    .single()

  const membershipRes = await supabase
    .from("organization_memberships")
    .select(
      "id, organization_id, user_id, role, status, joined_at, tasks_scope_override, dashboard_sections_override, primary_team_id, primary_category_id",
    )
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single()

  if (membershipRes.error || !membershipRes.data) {
    throw new Error("Sesión inválida: usuario sin membresía activa en la organización.")
  }

  cachedSession = await loadMembershipDetails(
    supabase,
    orgId,
    userId,
    membershipRes.data,
    settingsRes.data?.role_permissions as Record<string, unknown> | undefined,
    settingsRes.data?.features as Record<string, unknown> | undefined,
    isDemo,
  )
  return cachedSession
}

export async function getAuthUserId(): Promise<string | null> {
  try {
    const auth = await createAuthClient()
    const { data } = await auth.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}
