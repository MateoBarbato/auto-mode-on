"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-ranges"
import { cn } from "@/lib/utils"

export function DateRangeFilter({
  preset,
  from,
  to,
  rangeLabel,
}: {
  preset: RangePreset
  from?: string
  to?: string
  rangeLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from ?? "")
  const [customTo, setCustomTo] = useState(to ?? "")

  const updateParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const onPresetChange = (p: RangePreset) => {
    if (p === "todo") {
      updateParams({ rango: undefined, desde: undefined, hasta: undefined })
    } else if (p === "personalizado") {
      updateParams({ rango: p })
    } else {
      updateParams({ rango: p, desde: undefined, hasta: undefined })
    }
  }

  const applyCustom = () => {
    if (customFrom && customTo) {
      updateParams({ rango: "personalizado", desde: customFrom, hasta: customTo })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGE_PRESETS.map((r) => (
          <Button
            key={r.value}
            type="button"
            variant={preset === r.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "shrink-0",
              preset === r.value && "shadow-sm",
            )}
            onClick={() => onPresetChange(r.value)}
            aria-pressed={preset === r.value}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {rangeLabel ? (
        <p className="text-xs text-muted-foreground">
          Mostrando datos de <span className="font-medium text-foreground">{rangeLabel}</span>
        </p>
      ) : null}

      {preset === "personalizado" ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-desde" className="text-xs text-muted-foreground">
              Desde
            </label>
            <Input
              id="filter-desde"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-[150px] bg-background"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-hasta" className="text-xs text-muted-foreground">
              Hasta
            </label>
            <Input
              id="filter-hasta"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-[150px] bg-background"
            />
          </div>
          <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>
            Aplicar rango
          </Button>
        </div>
      ) : null}
    </div>
  )
}
