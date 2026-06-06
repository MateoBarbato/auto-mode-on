import { Suspense } from "react"
import { getOrgOverview } from "@/lib/data"
import { PageHeader, EmptyState } from "@/components/dashboard-ui"
import { StatusBreakdown } from "@/components/status-breakdown"
import { TeamLoad } from "@/components/team-load"
import { ProjectCard } from "@/components/project-card"
import { DateRangeFilter } from "@/components/date-range-filter"
import { DashboardFilters } from "@/components/dashboard-filters"
import { KpiRail } from "@/components/kpi-rail"
import { DueDateHistogram } from "@/components/due-date-histogram"
import { WorkloadChart } from "@/components/workload-chart"
import { DistributionChart } from "@/components/distribution-chart"
import { OperationalLists } from "@/components/operational-lists"
import { ActivityLineChart } from "@/components/activity-line-chart"
import { StackedBreakdownChart } from "@/components/stacked-breakdown-chart"
import { DashboardCollapsible } from "@/components/dashboard-collapsible"
import { toStackedChartRows } from "@/lib/aggregations"
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

async function DashboardContent({
  preset,
  from,
  to,
  searchParams,
}: {
  preset: RangePreset
  from?: string
  to?: string
  searchParams: Record<string, string | undefined>
}) {
  const overview = await getOrgOverview({ preset, from, to, searchParams })
  const { organization, stats, projects, categories, projectProgress, features, summary, session } =
    overview

  const activeProjects = projects.filter((p) => p.status !== "archived")
  const range = resolveRange(preset, from, to)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"

  return (
    <>
      <PageHeader
        title={organization.name}
        description="Lo que necesita atención ahora."
      >
        {session.isDemo ? (
          <span className="text-xs text-muted-foreground">Modo demo</span>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-8 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          </div>
          <DateRangeFilter preset={preset} from={from} to={to} />
        </div>

        <Suspense fallback={null}>
          <DashboardFilters
            teams={overview.teams}
            categories={categories}
            projects={projects}
            people={overview.people}
            features={features}
            showTeamCategory={features.team_category_filters}
            showProject={features.project_filters}
          />
        </Suspense>

        <KpiRail kpis={summary.kpis} searchParams={searchParams} />

        {stats.totalTasks === 0 ? (
          <EmptyState message="No hay tareas visibles con los filtros actuales." />
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Requiere atención</h2>
              <OperationalLists lists={summary.lists} />
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">Tareas recientes</h2>
                <Link href="/tasks/list" className="text-xs text-primary hover:underline">
                  Ver todas
                </Link>
              </div>
              {overview.recentTasks.length === 0 ? (
                <EmptyState message="Sin tareas recientes en este periodo." />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <ul className="divide-y divide-border">
                    {overview.recentTasks.slice(0, 8).map((task) => (
                      <li
                        key={task.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", statusMeta[task.status].dot)} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{task.task_title}</span>
                        {task.projectName ? (
                          <span className="hidden truncate text-xs text-muted-foreground sm:inline">{task.projectName}</span>
                        ) : task.is_global ? (
                          <span className="hidden text-xs text-muted-foreground sm:inline">Global</span>
                        ) : null}
                        <span className="w-24 shrink-0 truncate text-right text-xs text-muted-foreground">
                          {task.ownerName ?? "Sin asignar"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {features.projects && activeProjects.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">Proyectos</h2>
                  <Link href="/tasks/projects" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    Ver todos <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {activeProjects.slice(0, 3).map((project) => {
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
            ) : null}

            <DashboardCollapsible
              title="Análisis detallado"
              subtitle="Gráficos, distribución y carga de trabajo"
            >
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <DueDateHistogram data={summary.charts.dueDateBuckets} />
                  {features.team_load_view ? (
                    <WorkloadChart data={summary.charts.workloadByOwner} />
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <StatusBreakdown data={overview.statusBreakdown} total={stats.totalTasks} />
                  <DistributionChart
                    title="Prioridad"
                    subtitle="Distribución del backlog"
                    kind="priority"
                    rows={summary.charts.tasksByPriority.map((r) => ({ key: r.priority, count: r.count }))}
                  />
                  <DistributionChart
                    title="Origen"
                    subtitle="WhatsApp, reunión o manual"
                    kind="source"
                    rows={summary.charts.tasksBySource.map((r) => ({ key: r.sourceType, count: r.count }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ActivityLineChart
                    title="Tareas creadas por día"
                    subtitle="Volumen de entrada en el periodo"
                    data={summary.charts.tasksCreatedByDay}
                  />
                  {features.whatsapp_capture ? (
                    <ActivityLineChart
                      title="Capturas WhatsApp por día"
                      subtitle="Mensajes recibidos en el periodo"
                      data={summary.charts.inboundMessagesByDay}
                      emptyMessage="Sin capturas en el periodo."
                    />
                  ) : null}
                </div>

                {features.team_load_view ? (
                  <>
                    <TeamLoad teamLoad={overview.teamLoad} />
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <StackedBreakdownChart
                        title="Tareas por equipo y estado"
                        subtitle="Comparación de equipos"
                        rows={toStackedChartRows(summary.charts.tasksByTeamAndStatus, "teamId", "teamName")}
                      />
                      {features.team_category_filters ? (
                        <StackedBreakdownChart
                          title="Tareas por categoría y estado"
                          subtitle="Áreas programáticas"
                          rows={toStackedChartRows(summary.charts.tasksByCategoryAndStatus, "categoryId", "categoryName")}
                        />
                      ) : null}
                    </div>
                  </>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label="Miembros" value={overview.memberCount} />
                  <MiniStat label="Tasa de cierre" value={`${stats.completionRate}%`} />
                  <MiniStat label="En progreso" value={stats.inProgressTasks} />
                  <MiniStat label="Pendientes" value={stats.pendingTasks} />
                </div>
              </div>
            </DashboardCollapsible>
          </>
        )}
      </div>
    </>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const preset: RangePreset = VALID_PRESETS.includes(sp.rango as RangePreset)
    ? (sp.rango as RangePreset)
    : "todo"

  return (
    <div className="flex flex-col">
      <Suspense
        fallback={
          <div className="p-8 text-sm text-muted-foreground">Cargando resumen…</div>
        }
      >
        <DashboardContent preset={preset} from={sp.desde} to={sp.hasta} searchParams={sp} />
      </Suspense>
    </div>
  )
}
