"use client"

import { useState, useTransition } from "react"
import type { Invitation } from "@/lib/types"
import { revokeInvitation } from "@/lib/actions/user-admin"
import { roleMeta } from "@/lib/ui-helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/ui-helpers"
import { Copy, Check } from "lucide-react"

export function InvitationsList({ invitations }: { invitations: Invitation[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    void navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {invitations.map((inv) => (
        <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">{inv.email}</p>
            <p className="text-xs text-muted-foreground">
              {roleMeta[inv.role].label} · expira {formatDate(inv.expires_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{inv.status}</Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => copyLink(inv.token)}>
              {copied === inv.token ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="ml-1">Link</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await revokeInvitation(inv.id)
                  if (res.error) setError(res.error)
                })
              }
            >
              Revocar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
