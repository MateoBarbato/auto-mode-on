import { getGeneralTasks } from "@/lib/data"
import { PageHeader, StatCard } from "@/components/dashboard-ui"
import { DateRangeFilter } from "@/components/date-range-filter"
import { TaskList } from "@/components/task-list"
import { resolveRange, formatRangeLabel, type RangePreset } from "@/lib/date-ranges"

const VALID_PRESETS: RangePreset[] = [
  "todo",
  "esta_semana",
  "proxima_semana",
  "semana_pasada",
  "ultimo_mes",
  "ultimos_3_meses",
  "personalizado",
]

export default async function GeneralTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const preset: RangePreset = VALID_PRESETS.includes(sp.rango as RangePreset)
    ? (sp.rango as RangePreset)
    : "todo"

  const view = await getGeneralTasks({ preset, from: sp.desde, to: sp.hasta })
  const range = resolveRange(preset, sp.desde, sp.hasta)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"
  const { stats } = view

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tareas · Generales"
        description="Tareas de la organización que no están asociadas a ningún proyecto."
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Periodo</p>
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          </div>
          <DateRangeFilter preset={preset} from={sp.desde} to={sp.hasta} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} hint="Tareas sin proyecto" />
          <StatCard label="Pendientes" value={stats.pending} />
          <StatCard label="Vencidas" value={stats.overdue} accent={stats.overdue > 0 ? "danger" : "default"} />
          <StatCard label="Completadas" value={stats.completed} accent="success" />
        </div>

        <TaskList pendingTasks={view.pendingTasks} completedTasks={view.completedTasks} />
      </div>
    </div>
  )
}
