"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { PersonCard } from "@/components/person-card"
import { Search } from "lucide-react"
import type { UserProfile } from "@/lib/types"

export function PeopleDirectory({ profiles }: { profiles: UserProfile[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) => {
      const haystack = [
        p.user.display_name,
        p.membership.title ?? "",
        p.membership.role,
        ...p.teams.map((t) => t.name),
        ...p.categories.map((c) => c.name),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [profiles, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, cargo o equipo..."
          className="pl-9"
          aria-label="Buscar personas"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Ninguna persona coincide con &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((profile) => (
            <PersonCard key={profile.user.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  )
}
