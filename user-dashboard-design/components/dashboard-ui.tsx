import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-card/40 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between md:py-6">
      <div className="min-w-0">
        <h1 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  )
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: "default" | "success" | "warning" | "danger"
}) {
  const accentColor = {
    default: "text-foreground",
    success: "text-chart-2",
    warning: "text-chart-3",
    danger: "text-destructive",
  }[accent ?? "default"]

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums sm:text-3xl", accentColor)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
