import { cn } from "@/lib/utils"
import type { DashboardSummary } from "@/lib/types"

export function WorkloadChart({ data }: { data: DashboardSummary["charts"]["workloadByOwner"] }) {
  const top = data.slice(0, 8)
  const max = Math.max(...top.map((d) => d.openTasks), 1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Carga por responsable</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Abiertas, vencidas y bloqueadas</p>

      {top.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sin datos de carga en este alcance.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {top.map((row) => (
            <li key={row.ownerPeopleId ?? row.ownerLabel}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{row.ownerLabel}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {row.openTasks} abiertas
                  {row.overdueTasks > 0 ? ` · ${row.overdueTasks} venc.` : ""}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full bg-chart-1")}
                  style={{ width: `${(row.openTasks / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
