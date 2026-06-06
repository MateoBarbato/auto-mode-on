import { redirect } from "next/navigation"
import { PageHeader } from "@/components/dashboard-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InviteForm } from "@/components/settings/invite-form"
import { InvitationsList } from "@/components/settings/invitations-list"
import { UsersTable } from "@/components/settings/users-table"
import { getSessionContext } from "@/lib/data"
import { canManageUsers } from "@/lib/permissions"
import {
  getOrgMembers,
  getPendingInvitations,
  getTeamsAndCategoriesForAdmin,
} from "@/lib/user-admin-queries"

export default async function SettingsUsersPage() {
  const session = await getSessionContext()

  if (!canManageUsers(session)) {
    redirect("/")
  }

  const [members, invitations, { teams, categories }] = await Promise.all([
    getOrgMembers(),
    getPendingInvitations(),
    getTeamsAndCategoriesForAdmin(),
  ])

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Usuarios"
        description="Administra miembros del panel, roles, equipos e invitaciones de registro."
      />
      <div className="p-4 sm:p-6">
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Miembros ({members.length})</TabsTrigger>
            <TabsTrigger value="invitations">Invitaciones ({invitations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4 space-y-4">
            <UsersTable
              members={members}
              teams={teams}
              categories={categories}
              currentMembershipId={session.membershipId}
            />
          </TabsContent>

          <TabsContent value="invitations" className="mt-4 space-y-6">
            <InviteForm teams={teams} categories={categories} />
            <div>
              <h3 className="mb-3 text-sm font-semibold">Pendientes</h3>
              <InvitationsList invitations={invitations} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
