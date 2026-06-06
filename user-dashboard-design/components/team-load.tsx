import { cn } from "@/lib/utils"
import type { OrgOverview } from "@/lib/types"

export function TeamLoad({ teamLoad }: { teamLoad: OrgOverview["teamLoad"] }) {
  const maxLoad = Math.max(...teamLoad.map((t) => t.open + t.completed), 1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Carga de trabajo por equipo</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Tareas abiertas vs. completadas por equipo</p>

      <ul className="mt-4 flex flex-col gap-4">
        {teamLoad.map(({ team, open, completed, members }) => {
          const totalForTeam = open + completed
          return (
            <li key={team.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color ?? "var(--muted-foreground)" }}
                  />
                  <span className="truncate font-medium">{team.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">· {members} miembros</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {open} abiertas
                </span>
              </div>
              <div className="mt-1.5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-l-full bg-chart-1"
                  style={{ width: `${(open / maxLoad) * 100}%` }}
                />
                <div
                  className="h-full bg-chart-2"
                  style={{ width: `${(completed / maxLoad) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full bg-chart-1")} /> Abiertas
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full bg-chart-2")} /> Completadas
        </span>
      </div>
    </div>
  )
}
