"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export function DashboardCollapsible({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className,
}: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-xl border border-border bg-card", className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  )
}
