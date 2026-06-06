import { notFound } from "next/navigation"
import Link from "next/link"
import { getOrgOverview, getProjectDetail } from "@/lib/data"
import { PageHeader, StatCard } from "@/components/dashboard-ui"
import { DateRangeFilter } from "@/components/date-range-filter"
import { TaskList } from "@/components/task-list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { projectStatusMeta, formatDate } from "@/lib/ui-helpers"
import { resolveRange, formatRangeLabel, type RangePreset } from "@/lib/date-ranges"
import { ArrowLeft, Users } from "lucide-react"

const VALID_PRESETS: RangePreset[] = [
  "todo",
  "esta_semana",
  "proxima_semana",
  "semana_pasada",
  "ultimo_mes",
  "ultimos_3_meses",
  "personalizado",
]

export async function generateStaticParams() {
  const overview = await getOrgOverview()
  return overview.projects.map((p) => ({ slug: p.slug }))
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const preset: RangePreset = VALID_PRESETS.includes(sp.rango as RangePreset)
    ? (sp.rango as RangePreset)
    : "todo"

  const detail = await getProjectDetail(slug, { preset, from: sp.desde, to: sp.hasta })
  if (!detail) notFound()

  const { project, team, categories, stats } = detail
  const meta = projectStatusMeta[project.status]
  const range = resolveRange(preset, sp.desde, sp.hasta)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"

  return (
    <div className="flex flex-col">
      <PageHeader title={project.name} description={project.description ?? undefined}>
        <Badge variant="outline" className={cn("border-transparent", meta.badge)}>
          {meta.label}
        </Badge>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/tasks/projects"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a proyectos
        </Link>

        {/* Meta del proyecto */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {team ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {team.name}
            </span>
          ) : null}
          <span>
            {project.start_date ? formatDate(project.start_date + "T00:00:00Z") : "Por definir"}
            {" – "}
            {project.end_date ? formatDate(project.end_date + "T00:00:00Z") : "En curso"}
          </span>
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color ?? "var(--muted-foreground)" }}
              />
              {c.name}
            </span>
          ))}
        </div>

        {/* Filtro de fechas */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Periodo</p>
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          </div>
          <DateRangeFilter preset={preset} from={sp.desde} to={sp.hasta} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pendientes" value={stats.pending} />
          <StatCard label="Vencidas" value={stats.overdue} accent={stats.overdue > 0 ? "danger" : "default"} />
          <StatCard label="Avance" value={`${stats.completionRate}%`} hint={`${stats.completed} completadas`} accent="success" />
        </div>

        {/* Tareas */}
        <TaskList pendingTasks={detail.pendingTasks} completedTasks={detail.completedTasks} />
      </div>
    </div>
  )
}
