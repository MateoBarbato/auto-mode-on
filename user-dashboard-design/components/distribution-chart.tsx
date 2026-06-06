import { cn } from "@/lib/utils"
import { priorityMeta, statusMeta } from "@/lib/ui-helpers"
import type { TaskPriority, TaskStatus } from "@/lib/types"

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  meeting: "Reunión",
  manual: "Manual",
  unknown: "Sin origen",
}

const COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

export function DistributionChart({
  title,
  subtitle,
  rows,
  kind,
}: {
  title: string
  subtitle: string
  rows: Array<{ key: string; count: number }>
  kind: "status" | "priority" | "source"
}) {
  const total = rows.reduce((s, r) => s + r.count, 0)

  function label(key: string) {
    if (kind === "status") return statusMeta[key as TaskStatus]?.label ?? key
    if (kind === "priority") return priorityMeta[key as TaskPriority]?.label ?? key
    return SOURCE_LABELS[key] ?? key
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

      {total === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {rows.map((row, i) => (
              <div
                key={row.key}
                className={cn("h-full", COLORS[i % COLORS.length])}
                style={{ width: `${(row.count / total) * 100}%` }}
                title={`${label(row.key)}: ${row.count}`}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {rows.map((row, i) => (
              <li key={row.key} className="flex items-center gap-2 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full", COLORS[i % COLORS.length])} />
                <span className="text-muted-foreground">{label(row.key)}</span>
                <span className="ml-auto font-medium tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
