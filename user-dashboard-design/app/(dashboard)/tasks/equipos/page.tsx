import Link from "next/link"
import { redirect } from "next/navigation"
import { getTeamHierarchy, getSessionContext } from "@/lib/data"
import { PageHeader, EmptyState, StatCard } from "@/components/dashboard-ui"
import { DateRangeFilter } from "@/components/date-range-filter"
import { parseTaskRangePreset } from "@/components/task-scope-page"
import { resolveRange, formatRangeLabel } from "@/lib/date-ranges"
import { buildTaskListHref } from "@/lib/task-list-href"
import { ChevronRight } from "lucide-react"

export default async function TeamHierarchyPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>
}) {
  const session = await getSessionContext()
  if (!session.features.team_category_filters) {
    redirect("/tasks/projects")
  }

  const sp = await searchParams
  const preset = parseTaskRangePreset(sp.rango)
  const range = resolveRange(preset, sp.desde, sp.hasta)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"
  const rows = await getTeamHierarchy({ preset, from: sp.desde, to: sp.hasta })

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tareas · Por equipo"
        description="Tareas abiertas agrupadas por equipo y categoría programática."
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Periodo</p>
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          </div>
          <DateRangeFilter preset={preset} from={sp.desde} to={sp.hasta} />
        </div>

        {rows.length === 0 ? (
          <EmptyState message="No hay tareas abiertas en este periodo para tu alcance." />
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((row) => {
              const teamHref = buildTaskListHref(sp, {
                equipo: row.teamId ?? "sin_equipo",
                estado: "abiertas",
              })
              return (
                <section
                  key={row.teamId ?? "none"}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold">{row.teamName}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.openTasks} abiertas
                        {row.overdueTasks > 0 ? ` · ${row.overdueTasks} vencidas` : ""}
                      </p>
                    </div>
                    <Link
                      href={teamHref}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Ver todas
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {row.categories.map((cat) => (
                      <Link
                        key={`${row.teamId}-${cat.categoryId ?? "none"}`}
                        href={buildTaskListHref(sp, {
                          equipo: row.teamId ?? "sin_equipo",
                          categoria: cat.categoryId ?? "sin_categoria",
                          estado: "abiertas",
                        })}
                        className="block transition-opacity hover:opacity-90"
                      >
                        <StatCard label={cat.categoryName} value={cat.openTasks} hint="Abiertas" />
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
