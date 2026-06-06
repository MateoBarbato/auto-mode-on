import { getPeople } from "@/lib/data"
import { PageHeader } from "@/components/dashboard-ui"
import { PeopleDirectory } from "@/components/people-directory"

export default async function PeoplePage() {
  const profiles = await getPeople()

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Personas"
        description="Explora a los miembros del equipo y abre un perfil para ver sus tareas completadas y pendientes."
      />
      <div className="p-4 sm:p-6">
        <PeopleDirectory profiles={profiles} />
      </div>
    </div>
  )
}
