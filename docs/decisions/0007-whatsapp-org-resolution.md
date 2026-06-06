# 0007. Resolución de organización en WhatsApp (canal + identidad)

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

Multi-tenant requiere `organization_id` en cada mensaje entrante. Un mismo teléfono puede
existir en varias orgs (`people` scoped por org). Un solo número Twilio compartido
generaría ambigüedad.

## Decisión

Doble capa de resolución:

1. **`organization_channels`** — un número WhatsApp Twilio (`To`) por org → `organization_id`.
2. **`people`** — validar que `From` esté dado de alta en **esa** org.

Menú de bienvenida / redirección vía **`whatsapp_sessions`** cuando:
- Primer contacto en la línea de la org (`awaiting_welcome`).
- Remitente no registrado en la org pero sí en otra (`awaiting_org_redirect`).
- Remitente desconocido (`awaiting_welcome` + solicitud de acceso).

Feature flag: `whatsapp_welcome_menu`.

Task extraction **solo corre** con sesión `active` y `people` validado.

Alternativas descartadas:
- **Solo lookup por teléfono** — falla con multi-org.
- **Solo número por org sin validar people** — cualquiera podría escribir al bot.
- **Palabra clave en mensaje** — mala UX.

## Consecuencias

**Positivas:**
- Sin fugas entre orgs; persona multi-org usa el número correcto.
- Identidad atada a `people` + opcional `users.user_id`.
- Menú guía errores de canal.

**Negativas:**
- Un número Twilio por org (costo operativo).
- n8n más complejo (sesiones antes de tareas).
- Onboarding manual si el número no está en `people`.

## Referencias

- [`../architecture/data-model.md`](../architecture/data-model.md)
- [`../../prompts/whatsapp-org-resolution.md`](../../prompts/whatsapp-org-resolution.md)
- [`../../database/schema.sql`](../../database/schema.sql)

## Notas

- Sandbox hackathon: dos números demo en seeds (+14155238886 / +14155238887).
- Mateo en dos orgs en seeds demuestra el edge case resuelto por canal.
