-- Halketon — migration 001: chatbot proactivity settings
-- Apply on databases that already ran schema.sql before chatbot_proactivity landed.
--
-- Usage (Supabase SQL editor or psql):
--   database/migrations/001_chatbot_proactivity.sql
--
-- Rollback (dev only):
--   drop function if exists organization_allows_chatbot_outreach(uuid, outreach_type);
--   alter table organization_settings drop column if exists chatbot_proactivity;
--   drop function if exists resolve_chatbot_proactivity(jsonb);
--   drop function if exists chatbot_proactivity_defaults();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function chatbot_proactivity_defaults()
returns jsonb
language sql
immutable
as $$
  select '{
    "enabled": true,
    "task_reminders": true,
    "recurrence_suggestions": true,
    "recurrence_instances": true,
    "deadline_nudges": true,
    "custom_outreach": true
  }'::jsonb;
$$;

create or replace function resolve_chatbot_proactivity(settings jsonb)
returns jsonb
language sql
immutable
as $$
  select chatbot_proactivity_defaults() || coalesce(settings, '{}'::jsonb);
$$;

-- ---------------------------------------------------------------------------
-- organization_settings.chatbot_proactivity
-- ---------------------------------------------------------------------------

alter table organization_settings
  add column if not exists chatbot_proactivity jsonb not null default chatbot_proactivity_defaults()
    check (jsonb_typeof(chatbot_proactivity) = 'object');

-- ---------------------------------------------------------------------------
-- Outreach gate: features + per-org proactivity toggles
-- ---------------------------------------------------------------------------

create or replace function organization_allows_chatbot_outreach(
  org_id uuid,
  requested_outreach_type outreach_type
)
returns boolean
language sql
stable
as $$
  select coalesce((
    select
      case requested_outreach_type
        when 'welcome' then coalesce((os.features ->> 'whatsapp_welcome_menu')::boolean, true)
        when 'task_reminder' then
          coalesce((os.features ->> 'proactive_outreach')::boolean, true)
          and coalesce((os.features ->> 'reminders')::boolean, true)
          and coalesce((resolved.settings ->> 'enabled')::boolean, true)
          and coalesce((resolved.settings ->> 'task_reminders')::boolean, true)
        when 'recurrence_suggestion' then
          coalesce((os.features ->> 'proactive_outreach')::boolean, true)
          and coalesce((os.features ->> 'task_recurrence')::boolean, true)
          and coalesce((resolved.settings ->> 'enabled')::boolean, true)
          and coalesce((resolved.settings ->> 'recurrence_suggestions')::boolean, true)
        when 'recurrence_instance' then
          coalesce((os.features ->> 'proactive_outreach')::boolean, true)
          and coalesce((os.features ->> 'task_recurrence')::boolean, true)
          and coalesce((resolved.settings ->> 'enabled')::boolean, true)
          and coalesce((resolved.settings ->> 'recurrence_instances')::boolean, true)
        when 'deadline_nudge' then
          coalesce((os.features ->> 'proactive_outreach')::boolean, true)
          and coalesce((resolved.settings ->> 'enabled')::boolean, true)
          and coalesce((resolved.settings ->> 'deadline_nudges')::boolean, true)
        when 'custom' then
          coalesce((os.features ->> 'proactive_outreach')::boolean, true)
          and coalesce((resolved.settings ->> 'enabled')::boolean, true)
          and coalesce((resolved.settings ->> 'custom_outreach')::boolean, true)
        else false
      end
    from organization_settings os
    cross join lateral (
      select resolve_chatbot_proactivity(os.chatbot_proactivity) as settings
    ) resolved
    where os.organization_id = org_id
  ), false);
$$;
