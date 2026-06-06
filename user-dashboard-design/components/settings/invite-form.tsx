"use client"

import { useActionState } from "react"
import { createInvitation, type ActionResult } from "@/lib/actions/user-admin"
import type { Category, Team } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function InviteForm({ teams, categories }: { teams: Team[]; categories: Category[] }) {
  const [state, action, pending] = useActionState(createInvitation, {} as ActionResult)

  return (
    <form action={action} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Nueva invitación</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <Input name="email" type="email" required className="mt-1" placeholder="nuevo@org.org" />
        </div>
        <div>
          <label htmlFor="invite-role" className="text-xs text-muted-foreground">
            Rol
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="member"
            className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="member">Miembro</option>
            <option value="manager">Coordinador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="text-xs text-muted-foreground">Equipos</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {teams.map((t) => (
            <label key={t.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="team_ids" value={t.id} className="rounded border-border" />
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
              <input type="checkbox" name="category_ids" value={c.id} className="rounded border-border" />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-chart-2">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear invitación"}
      </Button>
    </form>
  )
}
