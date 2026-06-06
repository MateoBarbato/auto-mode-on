import { getOrgOverview } from "@/lib/data"
import { PageHeader } from "@/components/dashboard-ui"
import { ProjectCard } from "@/components/project-card"

export default async function ProjectsListPage() {
  const overview = await getOrgOverview()
  const { projects, categories, projectProgress } = overview

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tareas · Proyectos"
        description={`${projects.length} programas en ${overview.teams.length} equipos. Selecciona uno para ver sus tareas pendientes.`}
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const prog = projectProgress.find((p) => p.projectId === project.id)
          return (
            <ProjectCard
              key={project.id}
              project={project}
              categories={categories.filter((c) => project.category_ids.includes(c.id))}
              taskCount={prog?.total ?? 0}
              completedCount={prog?.completed ?? 0}
            />
          )
        })}
      </div>
    </div>
  )
}
