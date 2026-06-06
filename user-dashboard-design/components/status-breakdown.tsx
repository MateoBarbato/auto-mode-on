import { cn } from "@/lib/utils"
import { statusMeta } from "@/lib/ui-helpers"
import type { OrgOverview } from "@/lib/types"

export function StatusBreakdown({ data, total }: { data: OrgOverview["statusBreakdown"]; total: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Estado de las tareas</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{total} tareas en la organización</p>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {data.map((s) => (
          <div
            key={s.status}
            className={cn("h-full", statusMeta[s.status].dot)}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${statusMeta[s.status].label}: ${s.count}`}
          />
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {data.map((s) => (
          <li key={s.status} className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusMeta[s.status].dot)} />
            <span className="text-sm text-muted-foreground">{statusMeta[s.status].label}</span>
            <span className="ml-auto text-sm font-medium tabular-nums">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
