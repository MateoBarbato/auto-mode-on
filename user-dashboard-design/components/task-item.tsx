import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { statusMeta, priorityMeta, relativeDue, formatDate, initials } from "@/lib/ui-helpers"
import type { Task } from "@/lib/types"
import { CheckCircle2, Circle, FolderKanban } from "lucide-react"

export function TaskItem({
  task,
  meta,
  owner,
  projectName,
}: {
  task: Task
  meta?: string
  owner?: { name: string | null; avatar: string | null } | null
  projectName?: string | null
}) {
  const isDone = task.status === "done"
  const due = relativeDue(task.due_date)

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
        <div className="ml-1 flex shrink-0 items-center gap-2">
          {owner ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">{owner.name ?? "Sin asignar"}</span>
              <Avatar className="h-7 w-7">
                {owner.avatar ? <AvatarImage src={owner.avatar} alt={owner.name ?? ""} /> : null}
                <AvatarFallback className="text-[10px]">{initials(owner.name ?? "?")}</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">Sin asignar</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
