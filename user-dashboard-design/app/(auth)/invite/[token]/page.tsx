import Link from "next/link"
import { notFound } from "next/navigation"
import { InviteAcceptForm } from "@/components/invite-accept-form"
import { getInvitationByToken } from "@/lib/user-admin-queries"
import { roleMeta } from "@/lib/ui-helpers"
import { formatDate } from "@/lib/ui-helpers"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await getInvitationByToken(token)

  if (!invitation) notFound()

  const expired = new Date(invitation.expires_at) < new Date()

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-primary">Halketon</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Invitación a la organización</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te invitaron a unirte a {invitation.orgName}.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Email:</span> {invitation.email}
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">Rol:</span> {roleMeta[invitation.role].label}
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">Expira:</span> {formatDate(invitation.expires_at)}
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {expired ? (
          <p className="text-sm text-destructive">
            Esta invitación ha expirado. Pide una nueva al administrador.
          </p>
        ) : (
          <InviteAcceptForm token={token} inviteEmail={invitation.email} />
        )}

        <p className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Ir a inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
