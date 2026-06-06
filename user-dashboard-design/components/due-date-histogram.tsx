import { cn } from "@/lib/utils"
import type { DashboardSummary } from "@/lib/types"

const BUCKET_ACCENT: Record<string, string> = {
  vencidas: "bg-destructive",
  hoy: "bg-chart-3",
  "1_7_dias": "bg-chart-1",
  "8_30_dias": "bg-chart-5",
  sin_fecha: "bg-muted-foreground",
  mas_30_dias: "bg-chart-2",
}

export function DueDateHistogram({ data }: { data: DashboardSummary["charts"]["dueDateBuckets"] }) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Riesgo de vencimientos</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Tareas abiertas por ventana de vencimiento</p>

      {data.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No hay tareas abiertas en este alcance.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {data.map((row) => (
            <li key={row.bucket}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{row.label}</span>
                <span className="font-medium tabular-nums">{row.count}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", BUCKET_ACCENT[row.bucket] ?? "bg-chart-1")}
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
