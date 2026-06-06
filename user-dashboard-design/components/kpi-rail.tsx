import Link from "next/link"
import type { DashboardSummary } from "@/lib/types"
import { StatCard } from "@/components/dashboard-ui"
import { buildTaskListHref } from "@/lib/task-list-href"

export function KpiRail({
  kpis,
  searchParams = {},
}: {
  kpis: DashboardSummary["kpis"]
  searchParams?: Record<string, string | undefined>
}) {
  const href = (extra: Record<string, string | undefined>) => buildTaskListHref(searchParams, extra)

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Link href={href({ estado: "abiertas", filtro: "vencidas" })} className="block transition-opacity hover:opacity-90">
        <StatCard
          label="Vencidas"
          value={kpis.overdueTasks}
          accent={kpis.overdueTasks > 0 ? "danger" : "default"}
        />
      </Link>
      <Link href={href({ estado: "abiertas", filtro: "proximas" })} className="block transition-opacity hover:opacity-90">
        <StatCard label="Vencen esta semana" value={kpis.dueThisWeekTasks} />
      </Link>
      <Link href={href({ estado: "abiertas" })} className="block transition-opacity hover:opacity-90">
        <StatCard label="Abiertas" value={kpis.openTasks} />
      </Link>
      <Link href={href({ estado: "blocked" })} className="block transition-opacity hover:opacity-90">
        <StatCard
          label="Bloqueadas"
          value={kpis.blockedTasks}
          accent={kpis.blockedTasks > 0 ? "warning" : "default"}
        />
      </Link>
    </div>
  )
}
