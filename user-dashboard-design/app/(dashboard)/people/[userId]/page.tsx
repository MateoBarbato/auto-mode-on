import { notFound } from "next/navigation"
import Link from "next/link"
import { getPeople, getUserProfile } from "@/lib/data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskItem } from "@/components/task-item"
import { StatCard, EmptyState } from "@/components/dashboard-ui"
import { DateRangeFilter } from "@/components/date-range-filter"
import { cn } from "@/lib/utils"
import { initials, roleMeta } from "@/lib/ui-helpers"
import { resolveRange, formatRangeLabel, type RangePreset } from "@/lib/date-ranges"
import { ArrowLeft, Mail, Phone } from "lucide-react"

const VALID_PRESETS: RangePreset[] = [
  "todo",
  "esta_semana",
  "proxima_semana",
  "semana_pasada",
  "ultimo_mes",
  "ultimos_3_meses",
  "personalizado",
]

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>
}) {
  const { userId } = await params
  const sp = await searchParams
  const preset: RangePreset = VALID_PRESETS.includes(sp.rango as RangePreset)
    ? (sp.rango as RangePreset)
    : "todo"

  const profile = await getUserProfile(userId, { preset, from: sp.desde, to: sp.hasta })
  if (!profile) notFound()

  const { user, membership, teams, categories, stats, upcomingTasks, completedTasks } = profile
  const role = roleMeta[membership.role]
  const range = resolveRange(preset, sp.desde, sp.hasta)
  const rangeLabel = range ? formatRangeLabel(range) : "Todo el tiempo"

  return (
    <div className="flex flex-col">
      {/* Profile header */}
      <header className="border-b border-border bg-card/40 px-4 py-5 sm:px-6 md:py-6">
        <Link
          href="/people"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a personas
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-lg">{initials(user.display_name)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{user.display_name}</h1>
              <Badge variant="outline" className={cn("border-transparent", role.badge)}>
                {role.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{membership.title}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              {user.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {user.phone}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {teams.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color ?? "var(--muted-foreground)" }} />
              {t.name}
            </span>
          ))}
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
            >
              {c.name}
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {/* Filtro de fechas */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Periodo</p>
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          </div>
          <DateRangeFilter preset={preset} from={sp.desde} to={sp.hasta} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Completadas" value={stats.completed} accent="success" />
          <StatCard label="Pendientes" value={stats.upcoming} hint="Pendientes y en progreso" />
          <StatCard label="Vencidas" value={stats.overdue} accent={stats.overdue > 0 ? "danger" : "default"} />
          <StatCard label="Tasa de finalización" value={`${stats.completionRate}%`} hint={`${stats.total} tareas en total`} />
        </div>

        {/* Tareas */}
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Pendientes ({upcomingTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completadas ({completedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {upcomingTasks.length === 0 ? (
              <EmptyState message="No hay tareas pendientes. Todo al día." />
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedTasks.length === 0 ? (
              <EmptyState message="Aún no hay tareas completadas." />
            ) : (
              <div className="flex flex-col gap-2">
                {completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
