"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">No se pudo cargar el panel</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-muted"
      >
        Reintentar
      </button>
    </div>
  )
}
