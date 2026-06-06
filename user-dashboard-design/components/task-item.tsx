import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusMeta, priorityMeta, relativeDue, formatDate } from "@/lib/ui-helpers"
import type { Task } from "@/lib/types"
import { CheckCircle2, Circle, FolderKanban } from "lucide-react"

export function TaskItem({
  task,
  meta,
  owner,
  projectName,
  showScope = false,
}: {
  task: Task
  meta?: string
  owner?: { name: string | null } | null
  projectName?: string | null
  showScope?: boolean
}) {
  const isDone = task.status === "done"
  const due = relativeDue(task.due_date)
  const scopeLabel = showScope && !projectName
    ? task.is_global
      ? "Global"
      : task.project_id
        ? null
        : "Suelta"
    : null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary/40">
      <span className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-chart-2" />
        ) : (
          <Circle className={cn("h-4.5 w-4.5", statusMeta[task.status].dot.replace("bg-", "text-"))} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-snug text-pretty",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.task_title}
          </p>
        </div>

        {task.description ? (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("border-transparent text-xs", statusMeta[task.status].badge)}>
            {statusMeta[task.status].label}
          </Badge>
          {task.priority !== "normal" && task.priority !== "low" ? (
            <Badge variant="outline" className={cn("border-transparent text-xs", priorityMeta[task.priority].badge)}>
              {priorityMeta[task.priority].label}
            </Badge>
          ) : null}
          {projectName ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              {projectName}
            </span>
          ) : scopeLabel ? (
            <Badge variant="outline" className="border-transparent text-xs text-muted-foreground">
              {scopeLabel}
            </Badge>
          ) : null}
          {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
          {isDone ? (
            <span className="text-xs text-muted-foreground">Completada el {formatDate(task.completed_at)}</span>
          ) : (
            <span className={cn("text-xs", due.overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
              {due.label}
            </span>
          )}
        </div>
      </div>

      {owner !== undefined ? (
        <div className="ml-1 shrink-0 text-right">
          {owner ? (
            <span className="text-xs text-muted-foreground">{owner.name ?? "Sin asignar"}</span>
          ) : (
            <span className="text-xs italic text-muted-foreground">Sin asignar</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
