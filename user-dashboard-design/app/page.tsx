import { getOrgOverview } from "@/lib/data"
import { PageHeader, StatCard } from "@/components/dashboard-ui"
import { StatusBreakdown } from "@/components/status-breakdown"
import { TeamLoad } from "@/components/team-load"
import { ProjectCard } from "@/components/project-card"
import { DateRangeFilter } from "@/components/date-range-filter"
import { Badge } from "@/components/ui/badge"
import { statusMeta } from "@/lib/ui-helpers"
import { resolveRange, formatRangeLabel, type RangePreset } from "@/lib/date-ranges"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const VALID_PRESETS: RangePreset[] = [
  "todo",
  "esta_semana",
  "proxima_semana",
  "semana_pasada",
  "ultimo_mes",
  "ultimos_3_meses",
  "personalizado",
]

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const preset: RangePreset = VALID_PRESETS.includes(sp.rango as RangePreset)
    ? (sp.rango as RangePreset)
    : "todo"

  const overview = await getOrgOverview({ preset, from: sp.desde, to: sp.hasta })
  const { organization, stats, projects, categories, projectProgress } = overview

  const activeProjects = projects.filter((p) => p.status !== "archived")
  const range = resolveRange(preset, sp.desde, sp.hasta)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"

  return (
    <div className="flex flex-col">
      <PageHeader
        title={organization.name}
        description="Resumen de la organización: programas, estado de tareas y carga de trabajo de los equipos."
      >
        <Badge variant="outline" className="border-chart-2/30 bg-chart-2/15 text-chart-2">
          {organization.status === "active" ? "Activa" : "Suspendida"}
        </Badge>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {/* Filtro de fechas */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Periodo</p>
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          </div>
          <DateRangeFilter preset={preset} from={sp.desde} to={sp.hasta} />
        </div>

        {/* Indicadores clave */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Miembros del equipo" value={overview.memberCount} hint={`${overview.teams.length} equipos`} />
          <StatCard
            label="Proyectos activos"
            value={stats.activeProjects}
            hint={`${stats.completedProjects} completados`}
          />
          <StatCard
            label="Tasa de finalización"
            value={`${stats.completionRate}%`}
            hint={`${stats.completedTasks} de ${stats.totalTasks} tareas`}
            accent="success"
          />
          <StatCard
            label="Tareas vencidas"
            value={stats.overdueTasks}
            hint={`${stats.blockedTasks} bloqueadas`}
            accent={stats.overdueTasks > 0 ? "danger" : "default"}
          />
        </div>

        {stats.totalTasks === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No hay tareas en el periodo seleccionado.
          </div>
        ) : (
          <>
            {/* Gráficos */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <StatusBreakdown data={overview.statusBreakdown} total={stats.totalTasks} />
              <TeamLoad teamLoad={overview.teamLoad} />
            </div>
          </>
        )}

        {/* Proyectos */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Proyectos</h2>
            <Link
              href="/tasks/projects"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeProjects.slice(0, 6).map((project) => {
              const prog = projectProgress.find((p) => p.projectId === project.id)
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  categories={categories.filter((c) => project.category_ids.includes(c.id))}
                  taskCount={prog?.total ?? 0}
                  completedCount={prog?.completed ?? 0}
                />
              )
            })}
          </div>
        </section>

        {/* Actividad reciente */}
        <section>
          <h2 className="mb-3 text-base font-semibold">Tareas recientes</h2>
          {overview.recentTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Sin tareas recientes en este periodo.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {overview.recentTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
                  >
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", statusMeta[task.status].dot)}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{task.task_title}</span>
                    {task.projectName ? (
                      <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                        {task.projectName}
                      </span>
                    ) : task.is_global ? (
                      <span className="hidden text-xs text-muted-foreground sm:inline">Toda la organización</span>
                    ) : null}
                    <span className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground">
                      {task.ownerName ?? "Sin asignar"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
