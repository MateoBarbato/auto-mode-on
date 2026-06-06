import type { TaskStatus, TaskPriority, ProjectStatus, MemberRole } from "@/lib/types"
import { referenceNow } from "@/lib/data-source"

export const REFERENCE_DATE = new Date("2026-06-06T12:00:00Z")

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export function formatDate(iso: string | null): string {
  if (!iso) return "Sin fecha"
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
}

export function relativeDue(iso: string | null): { label: string; overdue: boolean } {
  if (!iso) return { label: "Sin fecha límite", overdue: false }
  const due = new Date(iso)
  const diffDays = Math.round((due.getTime() - referenceNow().getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} d de retraso`, overdue: true }
  if (diffDays === 0) return { label: "Vence hoy", overdue: false }
  if (diffDays === 1) return { label: "Vence mañana", overdue: false }
  return { label: `Vence en ${diffDays} d`, overdue: false }
}

export const statusMeta: Record<TaskStatus, { label: string; dot: string; badge: string }> = {
  pending: { label: "Pendiente", dot: "bg-muted-foreground", badge: "bg-secondary text-secondary-foreground" },
  in_progress: { label: "En progreso", dot: "bg-chart-1", badge: "bg-chart-1/15 text-chart-1 border-chart-1/30" },
  blocked: { label: "Bloqueada", dot: "bg-destructive", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  done: { label: "Completada", dot: "bg-chart-2", badge: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  cancelled: { label: "Cancelada", dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground" },
}

export const priorityMeta: Record<TaskPriority, { label: string; badge: string }> = {
  low: { label: "Baja", badge: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", badge: "bg-secondary text-secondary-foreground" },
  high: { label: "Alta", badge: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  urgent: { label: "Urgente", badge: "bg-destructive/15 text-destructive border-destructive/30" },
}

export const projectStatusMeta: Record<ProjectStatus, { label: string; badge: string }> = {
  planning: { label: "Planificación", badge: "bg-chart-5/15 text-chart-5 border-chart-5/30" },
  active: { label: "Activo", badge: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  on_hold: { label: "En pausa", badge: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  completed: { label: "Completado", badge: "bg-primary/15 text-primary border-primary/30" },
  archived: { label: "Archivado", badge: "bg-muted text-muted-foreground" },
}

export const roleMeta: Record<MemberRole, { label: string; badge: string }> = {
  owner: { label: "Propietario", badge: "bg-primary/15 text-primary border-primary/30" },
  admin: { label: "Administrador", badge: "bg-chart-1/15 text-chart-1 border-chart-1/30" },
  manager: { label: "Coordinador", badge: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  member: { label: "Miembro", badge: "bg-secondary text-secondary-foreground" },
}
