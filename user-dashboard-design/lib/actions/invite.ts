"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createSupabaseClient } from "@/lib/supabase/client"
import { createAuthClient } from "@/lib/supabase/server"
import { getInvitationByToken } from "@/lib/user-admin-queries"
import { clearSessionCache } from "@/lib/session"
import type { ActionResult } from "@/lib/actions/user-admin"

export async function acceptInvitation(token: string): Promise<ActionResult> {
  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    return { error: "Invitación no válida o expirada." }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "La invitación ha expirado." }
  }

  const auth = await createAuthClient()
  const { data: authData } = await auth.auth.getUser()
  if (!authData.user?.email) {
    return { error: "Debes iniciar sesión con el email de la invitación." }
  }

  const authEmail = authData.user.email.trim().toLowerCase()
  if (authEmail !== invitation.email.trim().toLowerCase()) {
    return { error: `Esta invitación es para ${invitation.email}. Has iniciado sesión como ${authEmail}.` }
  }

  const supabase = createSupabaseClient()

  let userId: string | null = null
  const existingUser = await supabase
    .from("users")
    .select("id")
    .eq("email", authEmail)
    .maybeSingle()

  if (existingUser.data?.id) {
    userId = existingUser.data.id as string
    await supabase
      .from("users")
      .update({ auth_user_id: authData.user.id })
      .eq("id", userId)
  } else {
    const displayName =
      (authData.user.user_metadata?.display_name as string | undefined) ??
      authEmail.split("@")[0]
    const insertRes = await supabase
      .from("users")
      .insert({
        email: authEmail,
        display_name: displayName,
        auth_user_id: authData.user.id,
        notification_email: authEmail,
      })
      .select("id")
      .single()
    if (insertRes.error || !insertRes.data) {
      return { error: insertRes.error?.message ?? "No se pudo crear el usuario." }
    }
    userId = insertRes.data.id as string
  }

  const existingMembership = await supabase
    .from("organization_memberships")
    .select("id, status")
    .eq("organization_id", invitation.organization_id)
    .eq("user_id", userId)
    .maybeSingle()

  let membershipId: string

  if (existingMembership.data?.id) {
    membershipId = existingMembership.data.id as string
    if (existingMembership.data.status === "suspended") {
      await supabase
        .from("organization_memberships")
        .update({ status: "active", role: invitation.role, joined_at: new Date().toISOString() })
        .eq("id", membershipId)
    }
  } else {
    const memRes = await supabase
      .from("organization_memberships")
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (memRes.error || !memRes.data) {
      return { error: memRes.error?.message ?? "No se pudo crear la membresía." }
    }
    membershipId = memRes.data.id as string
  }

  await supabase.from("membership_teams").delete().eq("membership_id", membershipId)
  await supabase.from("membership_categories").delete().eq("membership_id", membershipId)

  if (invitation.team_ids.length > 0) {
    await supabase.from("membership_teams").insert(
      invitation.team_ids.map((team_id) => ({ membership_id: membershipId, team_id })),
    )
  }
  if (invitation.category_ids.length > 0) {
    await supabase.from("membership_categories").insert(
      invitation.category_ids.map((category_id) => ({ membership_id: membershipId, category_id })),
    )
  }

  await supabase
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq("id", invitation.id)

  const cookieStore = await cookies()
  cookieStore.set("active_org_id", invitation.organization_id, { path: "/", maxAge: 60 * 60 * 24 * 365 })

  clearSessionCache()
  redirect("/")
}
