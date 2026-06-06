# WhatsApp org resolution + welcome menu

Every inbound WhatsApp message must resolve **`organization_id`** and validate the
**sender belongs to that org** before task extraction runs.

Uses **two layers** (defense in depth):

1. **Channel layer** — Twilio `To` number → `organization_channels` → org
2. **Identity layer** — Twilio `From` number → `people` row **in that org**

Optional **welcome menu** when identity fails or on first contact (`whatsapp_sessions`).

## Layer 1 — Resolve org from Twilio number

```sql
SELECT organization_id, id AS channel_id, display_name
FROM organization_channels
WHERE whatsapp_number = :webhook_to   -- normalize to whatsapp:+E164
  AND is_active;
```

| Result | Action |
|---|---|
| 1 row | `organization_id` resolved |
| 0 rows | Log error; reply "Canal no configurado"; **stop** |

Each org has **its own Twilio WhatsApp number** (see seeds). This avoids ambiguity when
the same person exists in multiple orgs — they must write to the correct number.

## Layer 2 — Validate sender in that org

```sql
SELECT id, display_name, user_id
FROM people
WHERE organization_id = :organization_id
  AND whatsapp_number = :webhook_from;
```

| Result | Action |
|---|---|
| 1 row | Sender authorized for this org → proceed (or welcome confirm) |
| 0 rows | Run **identity / redirect flow** (below) |

Cross-org lookup (for redirect menu only):

```sql
SELECT o.name, oc.whatsapp_number, oc.display_name
FROM people p
JOIN organizations o ON o.id = p.organization_id
JOIN organization_channels oc ON oc.organization_id = o.id AND oc.is_active
WHERE p.whatsapp_number = :webhook_from
  AND p.organization_id != :organization_id;
```

## Welcome / redirect menu

Enabled when `organization_settings.features.whatsapp_welcome_menu` is true.

### A — Known person, first message on this org line

Session: `whatsapp_sessions.status = awaiting_welcome` → user confirms → `active`.

```text
Hola {display_name}, escribiste a {org_display_name}.
1 — Confirmar, soy yo
2 — No soy yo / reportar error
```

On `1`: set session `active`, `people_id` linked; next message goes to task extraction.

### B — Unknown on this org line, but registered elsewhere

Session: `awaiting_org_redirect`.

```text
Tu número no está registrado en {org_display_name}.

Parece que pertenecés a:
1 — Red Comunitaria Norte (escribí al +1…887)
2 — Otra organización

Si deberías estar en {org_display_name}, pedile a coordinación que te den de alta.
```

### C — Unknown everywhere

```text
Bienvenido/a a {org_display_name}.
Tu número no está registrado.

1 — Soy del equipo (solicitar acceso)
2 — Me equivoqué de organización

Coordinación te va a contactar para darte acceso.
```

Store session; do **not** run task extraction until `active`.

## n8n decision tree (after webhook)

```text
1. Resolve org from To → organization_channels
2. Insert inbound_messages (organization_id set)
3. IF pending task_draft for (org, From) → project-assignment-reply flow
4. IF pending whatsapp_session awaiting_welcome/redirect → welcome-reply flow
5. Lookup people (org, From)
   - IF found AND no session → create session active (or awaiting_welcome if first time)
   - IF not found → create session awaiting_org_redirect or awaiting_welcome; send menu; STOP
6. IF session.status != active → handle menu reply; STOP
7. Run task-extraction (org + people + active_projects already scoped)
```

## Demo edge case (seeds)

Mateo (`+5491112345678`) exists in **both** orgs:

- Fundación Esperanza → write to `whatsapp:+14155238886`
- Red Comunitaria Norte → write to `whatsapp:+14155238887`

If Mateo writes to Esperanza's number → resolved to Esperanza; people row in Esperanza matches.

If Mateo writes to Norte's number → resolved to Norte; people row in Norte matches.

No cross-org leakage.

## Related

- Task extraction (after org validated): [`task-extraction.md`](./task-extraction.md)
- Flow diagram: [`../docs/diagrams/flows.md`](../docs/diagrams/flows.md) §1a
- ADR: [`../docs/decisions/0007-whatsapp-org-resolution.md`](../docs/decisions/0007-whatsapp-org-resolution.md)
