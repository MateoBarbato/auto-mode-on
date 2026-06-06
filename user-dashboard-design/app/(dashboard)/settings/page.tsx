import Link from "next/link"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/dashboard-ui"
import { getSessionContext } from "@/lib/data"
import { ArrowRight } from "lucide-react"

export default async function SettingsPage() {
  const session = await getSessionContext()

  if (!session.permissions.can_manage_settings && !session.permissions.can_manage_users) {
    redirect("/")
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Configuración"
        description="Ajustes de la organización y administración del panel."
      />
      <div className="space-y-3 p-4 sm:p-6">
        {session.permissions.can_manage_users ? (
          <Link
            href="/settings/users"
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm hover:bg-muted/40"
          >
            <span>Usuarios e invitaciones</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ) : null}
        <p className="text-sm text-muted-foreground">
          La configuración de features y permisos por rol se gestiona en el backend (organization_settings).
        </p>
      </div>
    </div>
  )
}
