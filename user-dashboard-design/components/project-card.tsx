import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { projectStatusMeta, formatDate } from "@/lib/ui-helpers"
import type { Project, Category } from "@/lib/types"

export function ProjectCard({
  project,
  categories,
  taskCount,
  completedCount,
}: {
  project: Project
  categories: Category[]
  taskCount: number
  completedCount: number
}) {
  const pct = taskCount ? Math.round((completedCount / taskCount) * 100) : 0
  const meta = projectStatusMeta[project.status]

  return (
    <Link
      href={`/tasks/projects/${project.slug}`}
      className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug text-pretty">{project.name}</h3>
        <Badge variant="outline" className={cn("shrink-0 border-transparent text-xs", meta.badge)}>
          {meta.label}
        </Badge>
      </div>

      {project.description ? (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
      ) : null}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progreso</span>
          <span className="font-medium tabular-nums">
            {completedCount}/{taskCount} · {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {categories.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color ?? "var(--muted-foreground)" }} />
            {c.name}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {project.start_date ? formatDate(project.start_date + "T00:00:00Z") : "Por definir"}
        {" – "}
        {project.end_date ? formatDate(project.end_date + "T00:00:00Z") : "En curso"}
      </p>
    </Link>
  )
}
