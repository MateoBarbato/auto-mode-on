import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null
let clientKey: string | null = null

export function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (client && clientKey === key) return client

  if (!url || !key) {
    throw new Error(
      "Faltan variables de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y " +
        "SUPABASE_SERVICE_ROLE_KEY (recomendado) o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local",
    )
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== "production") {
    console.warn(
      "[dashboard] Sin SUPABASE_SERVICE_ROLE_KEY: si ves 'permission denied', añade la service role key en .env.local",
    )
  }

  clientKey = key
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

export async function resolveOrgId(supabase: SupabaseClient): Promise<string> {
  const envId = process.env.DEMO_ORGANIZATION_ID
  if (envId) return envId

  const slug = process.env.DEMO_ORG_SLUG ?? "fundacion-esperanza"
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single()

  if (error || !data) {
    const msg = error?.message ?? "Sin datos"
    if (msg.includes("permission denied")) {
      throw new Error(
        `Sin permisos para leer organizations (${msg}). ` +
          "El proyecto Supabase necesita GRANT SELECT para service_role (lo aplica el equipo de backend/infra en el SQL editor de Supabase, no desde el dashboard). " +
          "Mientras tanto, verifica SUPABASE_SERVICE_ROLE_KEY en .env.local y reinicia el dev server.",
      )
    }
    throw new Error(`Organización no encontrada (slug: ${slug}). ${msg}`)
  }
  return data.id as string
}
