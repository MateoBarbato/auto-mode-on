import { cn } from "@/lib/utils"
import { statusMeta } from "@/lib/ui-helpers"
import type { TaskStatus } from "@/lib/types"

type Row = { id: string; label: string; segments: Array<{ status: TaskStatus; count: number }> }

const STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "blocked", "done", "cancelled"]

export function StackedBreakdownChart({
  title,
  subtitle,
  rows,
}: {
  title: string
  subtitle: string
  rows: Row[]
}) {
  const top = rows.slice(0, 8)
  const max = Math.max(...top.map((r) => r.segments.reduce((s, seg) => s + seg.count, 0)), 1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

      {top.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {top.map((row) => {
            const total = row.segments.reduce((s, seg) => s + seg.count, 0)
            return (
              <li key={row.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="truncate">{row.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{total}</span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {STATUS_ORDER.map((status) => {
                    const seg = row.segments.find((s) => s.status === status)
                    if (!seg || seg.count === 0) return null
                    return (
                      <div
                        key={status}
                        className={cn("h-full", statusMeta[status].dot)}
                        style={{ width: `${(seg.count / max) * 100}%` }}
                        title={`${statusMeta[status].label}: ${seg.count}`}
                      />
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
