import { REFERENCE_DATE } from "@/lib/ui-helpers"

// Presets de rango de fechas para el filtro del resumen.
export type RangePreset =
  | "todo"
  | "esta_semana"
  | "proxima_semana"
  | "semana_pasada"
  | "ultimo_mes"
  | "ultimos_3_meses"
  | "personalizado"

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "todo", label: "Todo el tiempo" },
  { value: "esta_semana", label: "Esta semana" },
  { value: "proxima_semana", label: "Semana siguiente" },
  { value: "semana_pasada", label: "Semana pasada" },
  { value: "ultimo_mes", label: "Último mes" },
  { value: "ultimos_3_meses", label: "Últimos 3 meses" },
  { value: "personalizado", label: "Personalizado" },
]

export interface DateRange {
  from: Date
  to: Date
}

// "Hoy" se ancla a la fecha de referencia del dataset de ejemplo para que los
// rangos den resultados consistentes en la demo. Al conectar Supabase, cambiar
// por `new Date()`.
const TODAY = REFERENCE_DATE

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(23, 59, 59, 999)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}

// Lunes como inicio de semana.
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = (x.getUTCDay() + 6) % 7
  return addDays(x, -day)
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(value + "T00:00:00Z")
  return Number.isNaN(d.getTime()) ? null : d
}

// Devuelve el rango de fechas para un preset, o null si es "todo el tiempo".
export function resolveRange(preset: RangePreset, from?: string, to?: string): DateRange | null {
  const weekStart = startOfWeek(TODAY)

  switch (preset) {
    case "esta_semana":
      return { from: weekStart, to: endOfDay(addDays(weekStart, 6)) }
    case "proxima_semana":
      return { from: addDays(weekStart, 7), to: endOfDay(addDays(weekStart, 13)) }
    case "semana_pasada":
      return { from: addDays(weekStart, -7), to: endOfDay(addDays(weekStart, -1)) }
    case "ultimo_mes":
      return { from: startOfDay(addDays(TODAY, -30)), to: endOfDay(TODAY) }
    case "ultimos_3_meses":
      return { from: startOfDay(addDays(TODAY, -90)), to: endOfDay(TODAY) }
    case "personalizado": {
      const f = parseDate(from)
      const t = parseDate(to)
      if (!f || !t) return null
      return { from: startOfDay(f), to: endOfDay(t) }
    }
    case "todo":
    default:
      return null
  }
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
  return `${fmt(range.from)} – ${fmt(range.to)}`
}
