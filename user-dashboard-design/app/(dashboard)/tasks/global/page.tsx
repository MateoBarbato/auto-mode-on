import { redirect } from "next/navigation"
import { getGlobalTasks, getSessionContext } from "@/lib/data"
import { TaskScopePage, parseTaskRangePreset } from "@/components/task-scope-page"

export default async function GlobalTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>
}) {
  const session = await getSessionContext()
  if (!session.features.global_tasks || !session.permissions.can_view_global_tasks) {
    redirect("/tasks/projects")
  }

  const sp = await searchParams
  const preset = parseTaskRangePreset(sp.rango)
  const view = await getGlobalTasks({ preset, from: sp.desde, to: sp.hasta })

  return (
    <TaskScopePage
      title="Tareas · Globales"
      description="Compromisos de toda la organización: personería, auditorías, obligaciones estatutarias."
      preset={preset}
      from={sp.desde}
      to={sp.hasta}
      stats={view.stats}
      view={view}
      statsHint="Alcance institucional"
    />
  )
}
