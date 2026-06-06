import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { initials, roleMeta } from "@/lib/ui-helpers"
import type { UserProfile } from "@/lib/types"

export function PersonCard({ profile }: { profile: UserProfile }) {
  const { user, membership, teams, stats } = profile
  const role = roleMeta[membership.role]

  return (
    <Link
      href={`/people/${user.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name} />
          <AvatarFallback>{initials(user.display_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight group-hover:text-primary">
            {user.display_name}
          </p>
          <p className="truncate text-sm text-muted-foreground">{membership.title}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("border-transparent text-xs", role.badge)}>
          {role.label}
        </Badge>
        {teams.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color ?? "var(--muted-foreground)" }} />
            {t.name}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
        <div>
          <p className="text-lg font-semibold tabular-nums text-chart-2">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completadas</p>
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums">{stats.upcoming}</p>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </div>
        <div>
          <p
            className={cn(
              "text-lg font-semibold tabular-nums",
              stats.overdue > 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {stats.overdue}
          </p>
          <p className="text-xs text-muted-foreground">Vencidas</p>
        </div>
      </div>
    </Link>
  )
}
