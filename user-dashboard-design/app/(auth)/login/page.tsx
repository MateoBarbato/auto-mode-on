import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { signOut } from "@/lib/actions/auth"
import { getAuthUserId } from "@/lib/session"
import { Button } from "@/components/ui/button"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const sp = await searchParams
  const authUserId = await getAuthUserId()
  const nextPath = sp.next?.startsWith("/") ? sp.next : "/"

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-primary">Halketon</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Inicio de sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Accede con tu cuenta. Sin sesión activa, el panel usa la configuración demo de{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>.
        </p>
      </div>

      {authUserId ? (
        <form action={signOut} className="mb-6 flex justify-center">
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      ) : null}

      <LoginForm nextPath={nextPath} />

      <div className="mt-8 space-y-3 border-t border-border pt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Variables útiles: <code>DEMO_ORG_SLUG</code>, <code>DEMO_USER_ID</code>,{" "}
          <code>DATA_SOURCE=supabase</code>.
        </p>
        <Link href="/" className="inline-block text-sm text-primary hover:underline">
          Volver al resumen
        </Link>
      </div>
    </div>
  )
}
