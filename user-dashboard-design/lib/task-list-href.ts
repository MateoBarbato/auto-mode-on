const FILTER_KEYS = [
  "rango",
  "desde",
  "hasta",
  "equipo",
  "categoria",
  "proyecto",
  "globales",
  "estado",
  "prioridad",
  "origen",
  "responsable",
  "modo",
  "filtro",
] as const

export function buildTaskListHref(
  searchParams: Record<string, string | undefined>,
  extra: Record<string, string | undefined> = {},
): string {
  const qs = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = extra[key] ?? searchParams[key]
    if (value) qs.set(key, value)
  }
  for (const [key, value] of Object.entries(extra)) {
    if (!FILTER_KEYS.includes(key as (typeof FILTER_KEYS)[number]) && value) {
      qs.set(key, value)
    }
  }
  const str = qs.toString()
  return str ? `/tasks/list?${str}` : "/tasks/list"
}
