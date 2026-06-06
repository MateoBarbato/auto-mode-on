"use server"

import { redirect } from "next/navigation"
import { createAuthClient } from "@/lib/supabase/server"
import { clearSessionCache } from "@/lib/session"

export type AuthActionResult = { error?: string }

export async function signInWithPassword(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." }
  }

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  clearSessionCache()
  const next = String(formData.get("next") ?? "/")
  redirect(next.startsWith("/") ? next : "/")
}

export async function signUpWithPassword(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const displayName = String(formData.get("display_name") ?? "").trim()

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." }
  }

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  })

  if (error) {
    return { error: error.message }
  }

  clearSessionCache()
  const next = String(formData.get("next") ?? "/")
  redirect(next.startsWith("/") ? next : "/")
}

export async function signOut() {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()
  clearSessionCache()
  redirect("/login")
}
