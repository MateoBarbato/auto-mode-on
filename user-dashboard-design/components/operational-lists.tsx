"use client"

import Link from "next/link"
import type { DashboardSummary } from "@/lib/types"
import { TaskItem } from "@/components/task-item"
import { EmptyState } from "@/components/dashboard-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TabKey = "overdue" | "dueSoon" | "blocked"

const TABS: { key: TabKey; label: string; href: string }[] = [
  { key: "overdue", label: "Vencidas", href: "/tasks/list?filtro=vencidas" },
  { key: "dueSoon", label: "Próximas", href: "/tasks/list?estado=abiertas&filtro=proximas" },
  { key: "blocked", label: "Bloqueadas", href: "/tasks/list?estado=blocked" },
]

export function OperationalLists({ lists }: { lists: DashboardSummary["lists"] }) {
  const counts: Record<TabKey, number> = {
    overdue: lists.overdue.length,
    dueSoon: lists.dueSoon.length,
    blocked: lists.blocked.length,
  }

  const defaultTab: TabKey =
    counts.overdue > 0 ? "overdue" : counts.dueSoon > 0 ? "dueSoon" : "blocked"

  const itemsByTab: Record<TabKey, DashboardSummary["lists"]["overdue"]> = {
    overdue: lists.overdue.slice(0, 5),
    dueSoon: lists.dueSoon.slice(0, 5),
    blocked: lists.blocked.slice(0, 5),
  }

  const emptyByTab: Record<TabKey, string> = {
    overdue: "No hay tareas vencidas.",
    dueSoon: "No hay vencimientos próximos.",
    blocked: "No hay tareas bloqueadas.",
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <Tabs defaultValue={defaultTab}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <TabsList variant="line" className="h-auto w-auto gap-0 bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="rounded-none px-3 py-1.5 data-active:after:opacity-100"
              >
                {tab.label}
                {counts[tab.key] > 0 ? (
                  <span className="ml-1.5 tabular-nums text-muted-foreground">({counts[tab.key]})</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <Link href="/tasks/list" className="text-xs text-primary hover:underline">
            Ver todas las tareas
          </Link>
        </div>

        {TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="px-4 py-3">
            {itemsByTab[tab.key].length === 0 ? (
              <EmptyState message={emptyByTab[tab.key]} />
            ) : (
              <div className="space-y-2">
                {itemsByTab[tab.key].map((t) => (
                  <TaskItem key={t.id} task={t} projectName={t.projectName} />
                ))}
              </div>
            )}
            {itemsByTab[tab.key].length > 0 ? (
              <div className="mt-3 text-right">
                <Link href={tab.href} className="text-xs text-primary hover:underline">
                  Ver todas →
                </Link>
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
