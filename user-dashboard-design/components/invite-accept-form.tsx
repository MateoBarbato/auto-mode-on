"use client"

import { useActionState } from "react"
import { acceptInvitation } from "@/lib/actions/invite"
import { signInWithPassword, signUpWithPassword, type AuthActionResult } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

async function acceptAfterAuth(_prev: { error?: string }, formData: FormData) {
  const token = String(formData.get("token") ?? "")
  return acceptInvitation(token)
}

export function InviteAcceptForm({ token, inviteEmail }: { token: string; inviteEmail: string }) {
  const [acceptState, acceptAction, acceptPending] = useActionState(acceptAfterAuth, {})
  const [signInState, signInAction, signInPending] = useActionState(signInWithPassword, {} as AuthActionResult)
  const [signUpState, signUpAction, signUpPending] = useActionState(signUpWithPassword, {} as AuthActionResult)

  return (
    <div className="space-y-4">
      <Tabs defaultValue="signup">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
          <TabsTrigger value="signin">Ya tengo cuenta</TabsTrigger>
        </TabsList>

        <TabsContent value="signup">
          <form action={signUpAction} className="mt-4 space-y-3">
            <Input name="email" type="email" defaultValue={inviteEmail} required readOnly className="bg-muted" />
            <Input name="display_name" type="text" placeholder="Tu nombre" />
            <Input name="password" type="password" required minLength={6} placeholder="Contraseña" />
            {signUpState.error ? <p className="text-sm text-destructive">{signUpState.error}</p> : null}
            <Button type="submit" className="w-full" disabled={signUpPending}>
              {signUpPending ? "Registrando…" : "Registrarse"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signin">
          <form action={signInAction} className="mt-4 space-y-3">
            <Input name="email" type="email" defaultValue={inviteEmail} required readOnly className="bg-muted" />
            <Input name="password" type="password" required placeholder="Contraseña" />
            {signInState.error ? <p className="text-sm text-destructive">{signInState.error}</p> : null}
            <Button type="submit" className="w-full" disabled={signInPending}>
              {signInPending ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <form action={acceptAction} className="border-t border-border pt-4">
        <input type="hidden" name="token" value={token} />
        <p className="mb-3 text-xs text-muted-foreground">
          Después de autenticarte con <strong>{inviteEmail}</strong>, acepta la invitación:
        </p>
        {acceptState.error ? <p className="mb-2 text-sm text-destructive">{acceptState.error}</p> : null}
        <Button type="submit" className="w-full" disabled={acceptPending}>
          {acceptPending ? "Aceptando…" : "Aceptar invitación"}
        </Button>
      </form>
    </div>
  )
}
