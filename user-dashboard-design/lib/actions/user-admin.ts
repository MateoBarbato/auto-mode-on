"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseClient } from "@/lib/supabase/client"
import { getSessionContext } from "@/lib/session"
import { canManageUsers } from "@/lib/permissions"
import type { MemberRole, MembershipStatus, TasksScope } from "@/lib/types"

export type ActionResult = { error?: string; success?: string }

async function assertCanManageUsers() {
  const session = await getSessionContext()
  if (!canManageUsers(session)) {
    throw new Error("No tienes permiso para administrar usuarios.")
  }
  return session
}

export async function createInvitation(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await assertCanManageUsers()
    const email = String(formData.get("email") ?? "").trim().toLowerCase()
    const role = String(formData.get("role") ?? "member") as MemberRole
    const teamIds = formData.getAll("team_ids").map(String)
    const categoryIds = formData.getAll("category_ids").map(String)

    if (!email) return { error: "El email es obligatorio." }

    const supabase = createSupabaseClient()
    const invRes = await supabase
      .from("invitations")
      .insert({
        organization_id: session.organizationId,
        email,
        role,
        invited_by: session.userId,
        status: "pending",
      })
      .select("id")
      .single()

    if (invRes.error || !invRes.data) {
      return { error: invRes.error?.message ?? "No se pudo crear la invitación." }
    }

    const invitationId = invRes.data.id as string

    if (teamIds.length > 0) {
      await supabase.from("invitation_teams").insert(
        teamIds.map((team_id) => ({ invitation_id: invitationId, team_id })),
      )
    }
    if (categoryIds.length > 0) {
      await supabase.from("invitation_categories").insert(
        categoryIds.map((category_id) => ({ invitation_id: invitationId, category_id })),
      )
    }

    revalidatePath("/settings/users")
    return { success: "Invitación creada." }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido." }
  }
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  try {
    await assertCanManageUsers()
    const supabase = createSupabaseClient()
    const { error } = await supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", invitationId)
      .eq("status", "pending")

    if (error) return { error: error.message }
    revalidatePath("/settings/users")
    return { success: "Invitación revocada." }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido." }
  }
}

export async function updateMembership(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await assertCanManageUsers()
    const membershipId = String(formData.get("membership_id") ?? "")
    const role = String(formData.get("role") ?? "") as MemberRole
    const status = String(formData.get("status") ?? "active") as MembershipStatus
    const tasksScopeOverride = String(formData.get("tasks_scope_override") ?? "")
    const teamIds = formData.getAll("team_ids").map(String)
    const categoryIds = formData.getAll("category_ids").map(String)

    if (!membershipId) return { error: "Membresía no especificada." }

    const supabase = createSupabaseClient()
    const { error } = await supabase
      .from("organization_memberships")
      .update({
        role,
        status,
        tasks_scope_override: tasksScopeOverride || null,
      })
      .eq("id", membershipId)
      .eq("organization_id", session.organizationId)

    if (error) return { error: error.message }

    await supabase.from("membership_teams").delete().eq("membership_id", membershipId)
    await supabase.from("membership_categories").delete().eq("membership_id", membershipId)

    if (teamIds.length > 0) {
      await supabase.from("membership_teams").insert(
        teamIds.map((team_id) => ({ membership_id: membershipId, team_id })),
      )
    }
    if (categoryIds.length > 0) {
      await supabase.from("membership_categories").insert(
        categoryIds.map((category_id) => ({ membership_id: membershipId, category_id })),
      )
    }

    revalidatePath("/settings/users")
    return { success: "Membresía actualizada." }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido." }
  }
}

export async function updateUserProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertCanManageUsers()
    const userId = String(formData.get("user_id") ?? "")
    const displayName = String(formData.get("display_name") ?? "").trim()
    const phone = String(formData.get("phone") ?? "").trim() || null

    if (!userId || !displayName) return { error: "Usuario y nombre son obligatorios." }

    const supabase = createSupabaseClient()
    const { error } = await supabase
      .from("users")
      .update({ display_name: displayName, phone })
      .eq("id", userId)

    if (error) return { error: error.message }
    revalidatePath("/settings/users")
    return { success: "Perfil actualizado." }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido." }
  }
}

export async function suspendMember(membershipId: string): Promise<ActionResult> {
  try {
    const session = await assertCanManageUsers()
    if (membershipId === session.membershipId) {
      return { error: "No puedes suspender tu propia membresía." }
    }

    const supabase = createSupabaseClient()
    const { error } = await supabase
      .from("organization_memberships")
      .update({ status: "suspended" })
      .eq("id", membershipId)
      .eq("organization_id", session.organizationId)

    if (error) return { error: error.message }
    revalidatePath("/settings/users")
    return { success: "Miembro suspendido." }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido." }
  }
}

export async function reactivateMember(membershipId: string): Promise<ActionResult> {
  try {
    await assertCanManageUsers()
    const supabase = createSupabaseClient()
    const { error } = await supabase
      .from("organization_memberships")
      .update({ status: "active" })
      .eq("id", membershipId)

    if (error) return { error: error.message }
    revalidatePath("/settings/users")
    return { success: "Miembro reactivado." }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido." }
  }
}

export type UpdateMembershipInput = {
  membershipId: string
  role: MemberRole
  status: MembershipStatus
  tasksScopeOverride: TasksScope | ""
  teamIds: string[]
  categoryIds: string[]
}
