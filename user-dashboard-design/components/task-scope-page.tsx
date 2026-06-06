import { PageHeader, StatCard } from "@/components/dashboard-ui"
import { DateRangeFilter } from "@/components/date-range-filter"
import { TaskList } from "@/components/task-list"
import { formatRangeLabel, resolveRange, type RangePreset } from "@/lib/date-ranges"
import type { GeneralTasksView } from "@/lib/types"

export const TASK_RANGE_PRESETS: RangePreset[] = [
  "todo",
  "esta_semana",
  "proxima_semana",
  "semana_pasada",
  "ultimo_mes",
  "ultimos_3_meses",
  "personalizado",
]

export function parseTaskRangePreset(rango?: string): RangePreset {
  return TASK_RANGE_PRESETS.includes(rango as RangePreset) ? (rango as RangePreset) : "todo"
}

export function TaskScopePage({
  title,
  description,
  preset,
  from,
  to,
  stats,
  view,
  statsHint,
  showProject = false,
  showScope = false,
}: {
  title: string
  description: string
  preset: RangePreset
  from?: string
  to?: string
  stats: GeneralTasksView["stats"]
  view: GeneralTasksView
  statsHint?: string
  showProject?: boolean
  showScope?: boolean
}) {
  const range = resolveRange(preset, from, to)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"

  return (
    <div className="flex flex-col">
      <PageHeader title={title} description={description} />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Periodo</p>
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          </div>
          <DateRangeFilter preset={preset} from={from} to={to} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} hint={statsHint} />
          <StatCard label="Pendientes" value={stats.pending} />
          <StatCard label="Vencidas" value={stats.overdue} accent={stats.overdue > 0 ? "danger" : "default"} />
          <StatCard label="Completadas" value={stats.completed} accent="success" />
        </div>

        <TaskList
          pendingTasks={view.pendingTasks}
          completedTasks={view.completedTasks}
          showProject={showProject}
          showScope={showScope}
        />
      </div>
    </div>
  )
}
