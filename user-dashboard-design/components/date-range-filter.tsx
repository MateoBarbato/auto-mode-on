"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-ranges"
import { CalendarRange } from "lucide-react"

export function DateRangeFilter({
  preset,
  from,
  to,
}: {
  preset: RangePreset
  from?: string
  to?: string
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

  const onPresetChange = (value: string | null) => {
    const p = (value ?? "todo") as RangePreset
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
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <Select value={preset} onValueChange={onPresetChange}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por rango de fechas">
            <SelectValue placeholder="Rango de fechas">
              {(value: string | null) =>
                RANGE_PRESETS.find((r) => r.value === value)?.label ?? "Rango de fechas"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RANGE_PRESETS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "personalizado" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-[150px]"
            aria-label="Fecha desde"
          />
          <span className="text-sm text-muted-foreground">a</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-[150px]"
            aria-label="Fecha hasta"
          />
          <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>
            Aplicar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
