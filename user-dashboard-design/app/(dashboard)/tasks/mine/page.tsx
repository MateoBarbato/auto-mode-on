import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/data"

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const session = await getSessionContext()
  if (!session.features.assigned_tasks_view) {
    redirect("/tasks/list")
  }

  const sp = await searchParams
  const qs = new URLSearchParams(sp as Record<string, string>)
  qs.set("vista", "mias")
  redirect(`/tasks/list?${qs.toString()}`)
}
