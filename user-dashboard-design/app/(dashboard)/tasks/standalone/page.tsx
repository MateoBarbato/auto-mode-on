import { redirect } from "next/navigation"
import { getStandaloneTasks, getSessionContext } from "@/lib/data"
import { TaskScopePage, parseTaskRangePreset } from "@/components/task-scope-page"

export default async function StandaloneTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>
}) {
  const session = await getSessionContext()
  if (!session.features.standalone_tasks) {
    redirect("/tasks/projects")
  }

  const sp = await searchParams
  const preset = parseTaskRangePreset(sp.rango)
  const view = await getStandaloneTasks({ preset, from: sp.desde, to: sp.hasta })

  return (
    <TaskScopePage
      title="Tareas · Sueltas"
      description="Tareas ad-hoc sin proyecto: capturas de WhatsApp, trámites puntuales, pendientes operativos."
      preset={preset}
      from={sp.desde}
      to={sp.hasta}
      stats={view.stats}
      view={view}
      statsHint="Sin proyecto ni alcance global"
    />
  )
}
