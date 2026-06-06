# 0002. Esquema multi-organización con jerarquía de usuarios

**Fecha:** 2026-06-06
**Estado:** Aceptado
**Decisor(es):** Equipo Halketon

## Contexto

El MVP original asumía una sola organización por instancia (ver non-goals en
[`../product/mvp-definition.md`](../product/mvp-definition.md)). En la hackathon
y el trabajo posterior identificamos que:

- Levantar una instancia por ONG no escala operativamente ni comercialmente.
- La dirección necesita ver distinto según su rol (directora vs. voluntaria).
- Cada ONG quiere activar/desactivar módulos (calendario, recordatorios, etc.).
- Hay que poder invitar usuarios al dashboard con roles y email para notificaciones.

Restricciones:
- Mantener Supabase/Postgres como source of truth.
- No agregar un backend custom pesado; el dashboard y n8n leen/escriben SQL.
- Compatibilidad con el flujo WhatsApp existente (people + tasks).

## Decisión

Adoptar un modelo **multi-tenant por `organization_id`** en todas las tablas
operacionales, con cuatro capas nuevas:

1. **`organizations` + `organization_settings`** — tenant root y config global
   (feature flags + permisos por rol en JSONB).
2. **`users` + `organization_memberships`** — cuentas de dashboard con rol
   (`owner` > `admin` > `manager` > `member`) que determinan visibilidad.
3. **`invitations`** — registro por link con token, email y rol pre-asignado.
4. **`people.user_id`** — enlace opcional entre contacto WhatsApp y cuenta dashboard.

Alternativas descartadas:
- **Schema por tenant (schemas Postgres separados)** — complejidad operativa alta
  para el tamaño del equipo y el hackathon.
- **Tabla de permisos normalizada (RBAC completo)** — over-engineering para el MVP;
  JSONB en `organization_settings` es suficiente y editable desde el dashboard.
- **Fusionar `users` y `people`** — mezcla identidades de canal (WhatsApp) con
  identidades de login (email); se mantiene separadas con FK opcional.

## Consecuencias

**Positivas:**
- Una sola instancia sirve N ONGs.
- Roles controlan qué ve cada usuario en el dashboard sin lógica duplicada.
- Admins configuran módulos por org desde settings.
- Invitaciones habilitan CRUD de usuarios sin onboarding manual.

**Negativas:**
- Toda query debe filtrar por `organization_id` (RLS pendiente de wiring con Supabase Auth).
- JSONB de permisos requiere validación en la app al editar settings.
- Migración: tablas existentes del MVP single-tenant necesitan `organization_id`.

**Técnicas:**
- Nuevos enums: `member_role`, `org_status`, `membership_status`, `invitation_status`.
- Trigger `bootstrap_organization_settings` crea config default al insertar org.
- Seeds demo con dos organizaciones y jerarquía de roles.

**Organizacionales:**
- El MVP definition debe actualizarse: multi-tenant ya no es non-goal.
- P4 (integración) debe validar aislamiento de datos entre orgs en smoke tests.

## Referencias

- [`../architecture/data-model.md`](../architecture/data-model.md)
- [`../../database/schema.sql`](../../database/schema.sql)
- [`../../database/seeds.sql`](../../database/seeds.sql)
- ADR anterior: [`0001-mvp-stack.md`](0001-mvp-stack.md)

## Notas

- RLS policies están comentadas en `schema.sql`; activar cuando se conecte Supabase Auth.
- El link de invitación (`/invite/{token}`) es responsabilidad del dashboard, no del DDL.
- `beneficiary_tracking` en features prepara Track 3 sin schema adicional aún.
