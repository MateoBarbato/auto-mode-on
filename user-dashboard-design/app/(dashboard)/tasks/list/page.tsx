import { Suspense } from "react"
import Link from "next/link"
import { getTaskList, getOrgOverview, getSessionContext } from "@/lib/data"
import { PageHeader, EmptyState } from "@/components/dashboard-ui"
import { TaskItem } from "@/components/task-item"
import { DateRangeFilter } from "@/components/date-range-filter"
import { DashboardFilters } from "@/components/dashboard-filters"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseTaskRangePreset } from "@/components/task-scope-page"
import { resolveRange, formatRangeLabel } from "@/lib/date-ranges"
import { ArrowLeft } from "lucide-react"

function exploreDescription(sp: Record<string, string | undefined>): string {
  if (sp.vista === "mias") return "Solo tareas asignadas a ti."
  if (sp.filtro === "vencidas") return "Tareas abiertas con fecha de vencimiento pasada."
  if (sp.filtro === "sin_responsable") return "Tareas abiertas sin responsable asignado."
  if (sp.filtro === "owner_no_vinculado") return "Tareas con nombre de responsable pero sin vincular a una persona."
  if (sp.filtro === "baja_confianza") return "Tareas extraídas con confianza del LLM por debajo del umbral."
  if (sp.filtro === "alta_prioridad") return "Tareas abiertas con prioridad alta o urgente."
  if (sp.filtro === "proximas") return "Tareas abiertas que vencen en los próximos 7 días."
  if (sp.globales === "solo_globales") return "Solo tareas globales de la organización."
  if (sp.proyecto === "ninguno") return "Solo tareas sueltas (sin proyecto)."
  if (sp.equipo) return "Filtradas por equipo y categoría."
  return "Vista cruzada con filtros. Para ver por alcance, usa Por proyecto, Globales o Sueltas en el menú."
}

async function TaskExploreContent({
  preset,
  from,
  to,
  searchParams,
}: {
  preset: ReturnType<typeof parseTaskRangePreset>
  from?: string
  to?: string
  searchParams: Record<string, string | undefined>
}) {
  const [view, overview, session] = await Promise.all([
    getTaskList({ preset, from, to, searchParams }),
    getOrgOverview({ preset, from, to, searchParams }),
    getSessionContext(),
  ])
  const range = resolveRange(preset, from, to)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"
  const title = searchParams.vista === "mias" ? "Mis tareas" : "Explorar tareas"

  return (
    <>
      <PageHeader
        title={title}
        description={`${exploreDescription(searchParams)} · ${rangeLabel}`}
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <DateRangeFilter preset={preset} from={from} to={to} />
          </div>
          <Suspense fallback={null}>
            <DashboardFilters
              teams={overview.teams}
              categories={overview.categories}
              projects={overview.projects}
              people={overview.people}
              features={session.features}
              showTeamCategory={session.features.team_category_filters}
              showProject={session.features.project_filters}
            />
          </Suspense>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Abiertas ({view.pendingTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completadas ({view.completedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-2">
            {view.pendingTasks.length === 0 ? (
              <EmptyState message="No hay tareas abiertas con estos filtros." />
            ) : (
              view.pendingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projectName={task.projectName}
                  owner={{ name: task.ownerName }}
                  showScope
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-2">
            {view.completedTasks.length === 0 ? (
              <EmptyState message="No hay tareas completadas en este periodo." />
            ) : (
              view.completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projectName={task.projectName}
                  owner={{ name: task.ownerName }}
                  showScope
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

export default async function TaskListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const preset = parseTaskRangePreset(sp.rango)
  const backHref = sp.vista === "mias" ? "/tasks/mine" : "/"

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </div>
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando tareas…</div>}>
        <TaskExploreContent preset={preset} from={sp.desde} to={sp.hasta} searchParams={sp} />
      </Suspense>
    </div>
  )
}
