import { REFERENCE_DATE } from "@/lib/ui-helpers"

export const USE_SUPABASE = process.env.DATA_SOURCE === "supabase"

/** Fecha de referencia para vencimientos y rangos: hoy en vivo, fija en mock. */
export function referenceNow(): Date {
  return USE_SUPABASE ? new Date() : REFERENCE_DATE
}
