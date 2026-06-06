"use client"

import { useActionState } from "react"
import type { Category, OrgMemberRow, Team } from "@/lib/types"
import type { ActionResult } from "@/lib/actions/user-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MemberEditDialog({
  row,
  teams,
  categories,
  onClose,
  onSaved,
  updateMembership,
}: {
  row: OrgMemberRow
  teams: Team[]
  categories: Category[]
  onClose: () => void
  onSaved: (msg: string) => void
  updateMembership: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const res = await updateMembership(prev, formData)
      if (res.success) onSaved(res.success)
      return res
    },
    {} as ActionResult,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <form action={action} className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Editar {row.user.display_name}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <input type="hidden" name="membership_id" value={row.membership.id} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Rol</label>
            <select
              name="role"
              defaultValue={row.membership.role}
              className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              <option value="member">Miembro</option>
              <option value="manager">Coordinador</option>
              <option value="admin">Administrador</option>
              <option value="owner">Propietario</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <select
              name="status"
              defaultValue={row.membership.status}
              className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Scope override (opcional)</label>
          <select
            name="tasks_scope_override"
            defaultValue={row.membership.tasks_scope_override ?? ""}
            className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Default del rol</option>
            <option value="all">Todas</option>
            <option value="team">Equipo</option>
            <option value="assigned">Asignadas</option>
          </select>
        </div>

        <fieldset>
          <legend className="text-xs text-muted-foreground">Equipos</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {teams.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="team_ids"
                  value={t.id}
                  defaultChecked={row.membership.team_ids.includes(t.id)}
                  className="rounded border-border"
                />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs text-muted-foreground">Categorías</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="category_ids"
                  value={c.id}
                  defaultChecked={row.membership.category_ids.includes(c.id)}
                  className="rounded border-border"
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="text-xs text-muted-foreground">Nombre visible</label>
          <Input name="display_name" defaultValue={row.user.display_name} className="mt-1" disabled />
          <p className="mt-1 text-xs text-muted-foreground">Edición de perfil vía formulario separado (próximo).</p>
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  )
}
