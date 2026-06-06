"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Category, OrgFeatures, Person, Project, Team } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { SlidersHorizontal, X } from "lucide-react"

type Props = {
  teams: Team[]
  categories: Category[]
  projects: Project[]
  people: Person[]
  features: OrgFeatures
  showTeamCategory: boolean
  showProject: boolean
}

const FILTER_KEYS = [
  "equipo",
  "categoria",
  "proyecto",
  "globales",
  "estado",
  "responsable",
  "prioridad",
  "origen",
  "modo",
] as const

const STATUS_LABELS: Record<string, string> = {
  abiertas: "Abiertas",
  pending: "Pendiente",
  in_progress: "En progreso",
  blocked: "Bloqueada",
  done: "Completada",
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  meeting: "Reunión",
  manual: "Manual",
}

const GLOBAL_LABELS: Record<string, string> = {
  solo_globales: "Solo globales",
  sin_globales: "Sin globales",
}

function mergeParams(current: URLSearchParams, key: string, value: string | null) {
  const next = new URLSearchParams(current.toString())
  if (!value || value === "todos") next.delete(key)
  else next.set(key, value)
  return next
}

function clearFilterParams(current: URLSearchParams) {
  const next = new URLSearchParams(current.toString())
  for (const key of FILTER_KEYS) next.delete(key)
  return next
}

function FilterSelect({
  label,
  param,
  value,
  options,
  onChange,
}: {
  label: string
  param: string
  value: string
  options: { value: string; label: string }[]
  onChange: (param: string, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(v) => onChange(param, v)}>
        <SelectTrigger className="h-9 w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

type ActiveChip = { key: string; label: string; value: string }

function buildActiveChips(
  searchParams: URLSearchParams,
  teams: Team[],
  categories: Category[],
  projects: Project[],
  people: Person[],
): ActiveChip[] {
  const chips: ActiveChip[] = []

  const equipo = searchParams.get("equipo")
  if (equipo) {
    const team = teams.find((t) => t.id === equipo)
    chips.push({ key: "equipo", label: "Equipo", value: team?.name ?? equipo })
  }

  const categoria = searchParams.get("categoria")
  if (categoria) {
    const cat = categories.find((c) => c.id === categoria)
    chips.push({ key: "categoria", label: "Categoría", value: cat?.name ?? categoria })
  }

  const proyecto = searchParams.get("proyecto")
  if (proyecto) {
    const value =
      proyecto === "ninguno"
        ? "Sin proyecto"
        : (projects.find((p) => p.id === proyecto)?.name ?? proyecto)
    chips.push({ key: "proyecto", label: "Proyecto", value })
  }

  const globales = searchParams.get("globales")
  if (globales && globales !== "todos") {
    chips.push({ key: "globales", label: "Globales", value: GLOBAL_LABELS[globales] ?? globales })
  }

  const estado = searchParams.get("estado")
  if (estado && estado !== "todos") {
    chips.push({ key: "estado", label: "Estado", value: STATUS_LABELS[estado] ?? estado })
  }

  const responsable = searchParams.get("responsable")
  if (responsable) {
    const person = people.find((p) => p.id === responsable)
    chips.push({ key: "responsable", label: "Responsable", value: person?.display_name ?? responsable })
  }

  const prioridad = searchParams.get("prioridad")
  if (prioridad && prioridad !== "todos") {
    chips.push({ key: "prioridad", label: "Prioridad", value: PRIORITY_LABELS[prioridad] ?? prioridad })
  }

  const origen = searchParams.get("origen")
  if (origen && origen !== "todos") {
    chips.push({ key: "origen", label: "Origen", value: SOURCE_LABELS[origen] ?? origen })
  }

  const modo = searchParams.get("modo")
  if (modo && modo !== "due_date") {
    chips.push({ key: "modo", label: "Fecha por", value: modo === "created_at" ? "Creación" : modo })
  }

  return chips
}

export function DashboardFilters({
  teams,
  categories,
  projects,
  people,
  features,
  showTeamCategory,
  showProject,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  if (!showTeamCategory && !showProject && !features.global_tasks) return null

  const navigate = (params: URLSearchParams) => {
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const onFilterChange = (param: string, value: string) => {
    navigate(mergeParams(searchParams, param, value))
  }

  const removeChip = (key: string) => {
    navigate(mergeParams(searchParams, key, null))
  }

  const activeChips = buildActiveChips(searchParams, teams, categories, projects, people)
  const clearHref = (() => {
    const qs = clearFilterParams(searchParams).toString()
    return qs ? `${pathname}?${qs}` : pathname
  })()

  const scopeFilters = [
    showTeamCategory ? (
      <FilterSelect
        key="equipo"
        label="Equipo"
        param="equipo"
        value={searchParams.get("equipo") ?? "todos"}
        onChange={onFilterChange}
        options={[
          { value: "todos", label: "Todos los equipos" },
          ...teams.map((t) => ({ value: t.id, label: t.name })),
        ]}
      />
    ) : null,
    showTeamCategory ? (
      <FilterSelect
        key="categoria"
        label="Categoría"
        param="categoria"
        value={searchParams.get("categoria") ?? "todos"}
        onChange={onFilterChange}
        options={[
          { value: "todos", label: "Todas las categorías" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
    ) : null,
    showProject && features.projects ? (
      <FilterSelect
        key="proyecto"
        label="Proyecto"
        param="proyecto"
        value={searchParams.get("proyecto") ?? "todos"}
        onChange={onFilterChange}
        options={[
          { value: "todos", label: "Todos los proyectos" },
          { value: "ninguno", label: "Sin proyecto" },
          ...projects.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />
    ) : null,
    features.global_tasks ? (
      <FilterSelect
        key="globales"
        label="Tareas globales"
        param="globales"
        value={searchParams.get("globales") ?? "todos"}
        onChange={onFilterChange}
        options={[
          { value: "todos", label: "Incluir todas" },
          { value: "solo_globales", label: "Solo globales" },
          { value: "sin_globales", label: "Sin globales" },
        ]}
      />
    ) : null,
  ].filter(Boolean)

  const taskFilters = [
    <FilterSelect
      key="estado"
      label="Estado"
      param="estado"
      value={searchParams.get("estado") ?? "todos"}
      onChange={onFilterChange}
      options={[
        { value: "todos", label: "Todos los estados" },
        { value: "abiertas", label: "Abiertas" },
        { value: "pending", label: "Pendiente" },
        { value: "in_progress", label: "En progreso" },
        { value: "blocked", label: "Bloqueada" },
        { value: "done", label: "Completada" },
      ]}
    />,
    <FilterSelect
      key="responsable"
      label="Responsable"
      param="responsable"
      value={searchParams.get("responsable") ?? "todos"}
      onChange={onFilterChange}
      options={[
        { value: "todos", label: "Cualquier responsable" },
        ...people.map((p) => ({ value: p.id, label: p.display_name })),
      ]}
    />,
    <FilterSelect
      key="prioridad"
      label="Prioridad"
      param="prioridad"
      value={searchParams.get("prioridad") ?? "todos"}
      onChange={onFilterChange}
      options={[
        { value: "todos", label: "Todas las prioridades" },
        { value: "low", label: "Baja" },
        { value: "normal", label: "Normal" },
        { value: "high", label: "Alta" },
        { value: "urgent", label: "Urgente" },
      ]}
    />,
    <FilterSelect
      key="origen"
      label="Origen"
      param="origen"
      value={searchParams.get("origen") ?? "todos"}
      onChange={onFilterChange}
      options={[
        { value: "todos", label: "Todos los orígenes" },
        { value: "whatsapp", label: "WhatsApp" },
        { value: "meeting", label: "Reunión" },
        { value: "manual", label: "Manual" },
      ]}
    />,
    <FilterSelect
      key="modo"
      label="Filtrar fechas por"
      param="modo"
      value={searchParams.get("modo") ?? "due_date"}
      onChange={onFilterChange}
      options={[
        { value: "due_date", label: "Fecha de vencimiento" },
        { value: "created_at", label: "Fecha de creación" },
      ]}
    />,
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros avanzados
                {activeChips.length > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5">
                    {activeChips.length}
                  </Badge>
                ) : null}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-[min(100vw-2rem,32rem)] p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium">Refinar vista</p>
              <p className="text-xs text-muted-foreground">
                Los cambios se aplican al cerrar cada selector.
              </p>
            </div>
            <div className="flex flex-col gap-4 p-4">
              {scopeFilters.length > 0 ? (
                <section>
                  <p className="mb-3 text-xs font-medium text-muted-foreground">
                    Alcance
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">{scopeFilters}</div>
                </section>
              ) : null}
              {scopeFilters.length > 0 ? <Separator /> : null}
              <section>
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  Tarea
                </p>
                <div className="grid gap-3 sm:grid-cols-2">{taskFilters}</div>
              </section>
            </div>
          </PopoverContent>
        </Popover>

        {activeChips.length > 0 ? (
          <Link
            href={clearHref}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpiar filtros
          </Link>
        ) : null}
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              <span className="text-muted-foreground">{chip.label}:</span>
              {chip.value}
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Quitar filtro ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
