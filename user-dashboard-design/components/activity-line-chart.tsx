import { cn } from "@/lib/utils"

export function ActivityLineChart({
  title,
  subtitle,
  data,
  emptyMessage = "Sin datos en el periodo.",
}: {
  title: string
  subtitle: string
  data: Array<{ day: string; count: number }>
  emptyMessage?: string
}) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

      {data.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-5 flex items-end gap-1 h-28">
          {data.map((point) => (
            <div key={point.day} className="flex flex-1 flex-col items-center gap-1 min-w-0">
              <div
                className={cn("w-full max-w-8 rounded-t bg-chart-1 transition-all")}
                style={{ height: `${(point.count / max) * 100}%`, minHeight: point.count > 0 ? "4px" : "0" }}
                title={`${point.day}: ${point.count}`}
              />
              <span className="truncate text-[10px] text-muted-foreground w-full text-center">
                {point.day.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
