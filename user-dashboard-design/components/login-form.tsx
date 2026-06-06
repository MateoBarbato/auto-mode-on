"use client"

import { useActionState, useTransition, type FormEvent } from "react"
import { signInWithPassword, signUpWithPassword, type AuthActionResult } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"

const initial: AuthActionResult = {}

export function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const [signInState, signInAction, signInPending] = useActionState(signInWithPassword, initial)
  const [signUpState, signUpAction, signUpPending] = useActionState(signUpWithPassword, initial)
  const [, startTransition] = useTransition()

  function submitSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => signInAction(formData))
  }

  function submitSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => signUpAction(formData))
  }

  const inputClass =
    "mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

  return (
    <div className="space-y-8">
      <form onSubmit={submitSignIn} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div>
          <label htmlFor="signin-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue="admin@esperanza.org"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signin-password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>
        {signInState.error ? <p className="text-sm text-destructive">{signInState.error}</p> : null}
        <Button type="submit" className="w-full" disabled={signInPending}>
          {signInPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Demo (después de seeds-auth.sql)</p>
        <p>Admin: <code>admin@esperanza.org</code> / <code>admin</code></p>
        <p>User: <code>user@esperanza.org</code> / <code>user</code></p>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Crear cuenta nueva
        </summary>
        <form onSubmit={submitSignUp} className="mt-4 space-y-3">
          <input type="hidden" name="next" value={nextPath} />
          <div>
            <label htmlFor="signup-name" className="text-sm font-medium">
              Nombre
            </label>
            <input id="signup-name" name="display_name" type="text" className={inputClass} />
          </div>
          <div>
            <label htmlFor="signup-email" className="text-sm font-medium">
              Email
            </label>
            <input id="signup-email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="signup-password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          {signUpState.error ? <p className="text-sm text-destructive">{signUpState.error}</p> : null}
          <Button type="submit" variant="outline" className="w-full" disabled={signUpPending}>
            {signUpPending ? "Creando cuenta…" : "Registrarse"}
          </Button>
        </form>
      </details>
    </div>
  )
}
