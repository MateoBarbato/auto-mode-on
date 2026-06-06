"use client"

import { useState, useTransition } from "react"
import type { Category, OrgMemberRow, Team } from "@/lib/types"
import { suspendMember, reactivateMember, updateMembership } from "@/lib/actions/user-admin"
import { roleMeta } from "@/lib/ui-helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MemberEditDialog } from "@/components/settings/member-edit-dialog"

export function UsersTable({
  members,
  teams,
  categories,
  currentMembershipId,
}: {
  members: OrgMemberRow[]
  teams: Team[]
  categories: Category[]
  currentMembershipId: string
}) {
  const [editing, setEditing] = useState<OrgMemberRow | null>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <>
      {message ? <p className="mb-3 text-sm text-muted-foreground">{message}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Equipos</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((row) => (
              <tr key={row.membership.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.user.display_name}</p>
                  <p className="text-xs text-muted-foreground">{row.user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={roleMeta[row.membership.role].badge}>
                    {roleMeta[row.membership.role].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.teams.map((t) => t.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{row.membership.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                    {row.membership.id !== currentMembershipId ? (
                      row.membership.status === "active" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await suspendMember(row.membership.id)
                              setMessage(res.success ?? res.error ?? null)
                            })
                          }
                        >
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await reactivateMember(row.membership.id)
                              setMessage(res.success ?? res.error ?? null)
                            })
                          }
                        >
                          Reactivar
                        </Button>
                      )
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <MemberEditDialog
          row={editing}
          teams={teams}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null)
            setMessage(msg)
          }}
          updateMembership={updateMembership}
        />
      ) : null}
    </>
  )
}
