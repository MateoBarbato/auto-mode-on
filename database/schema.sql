-- Halketon — PostgreSQL schema (Supabase-compatible)
-- Multi-organization: one deployment serves many NGOs.
--
-- Fresh database:
--   psql $DATABASE_URL -f database/schema.sql
--   psql $DATABASE_URL -f database/seeds.sql
--
-- Re-apply after schema changes (destroys existing data):
--   psql $DATABASE_URL -f database/reset.sql
--   psql $DATABASE_URL -f database/schema.sql
--   psql $DATABASE_URL -f database/seeds.sql
--
-- Partial update (e.g. only a fixed function): run just that CREATE OR REPLACE block.
-- Do not re-run this whole file on a populated database — types/tables already exist.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type org_status as enum ('active', 'suspended');

create type member_role as enum ('owner', 'admin', 'manager', 'member');

create type membership_status as enum ('pending', 'active', 'suspended');

create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create type task_status as enum (
  'pending',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create type task_priority as enum ('low', 'normal', 'high', 'urgent');

create type project_status as enum (
  'planning',
  'active',
  'on_hold',
  'completed',
  'archived'
);

create type project_channel as enum ('dashboard', 'whatsapp', 'meeting');

create type task_draft_status as enum (
  'awaiting_project_choice',
  'confirmed',
  'expired',
  'cancelled'
);

create type whatsapp_session_status as enum (
  'awaiting_welcome',
  'awaiting_org_redirect',
  'active',
  'expired'
);

create type outreach_type as enum (
  'task_reminder',
  'recurrence_suggestion',
  'recurrence_instance',
  'deadline_nudge',
  'welcome',
  'custom'
);

create type outreach_status as enum (
  'scheduled',
  'sent',
  'failed',
  'skipped',
  'cancelled'
);

create type recurrence_status as enum (
  'suggested',
  'active',
  'paused',
  'archived'
);

create type recurrence_interval as enum (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizations (tenant root)
-- ---------------------------------------------------------------------------

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  status      org_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Organization settings (feature flags + role defaults)
-- Dashboard reads/writes this table to enable or disable modules per org.
-- ---------------------------------------------------------------------------

create table organization_settings (
  organization_id uuid primary key references organizations (id) on delete cascade,

  -- Global feature toggles for the org (dashboard + backend honor these).
  features jsonb not null default '{
    "whatsapp_capture": true,
    "meeting_memory": true,
    "reminders": true,
    "calendar_view": true,
    "team_load_view": true,
    "assigned_tasks_view": true,
    "team_category_filters": true,
    "project_filters": true,
    "standalone_tasks": true,
    "global_tasks": true,
    "whatsapp_welcome_menu": true,
    "proactive_outreach": true,
    "task_recurrence": true,
    "projects": true,
    "beneficiary_tracking": false
  }'::jsonb,

  -- Default dashboard visibility and data scope per role.
  -- tasks_scope: "all" | "team" | "assigned"
  role_permissions jsonb not null default '{
    "owner": {
      "dashboard_sections": ["summary", "global_tasks", "tasks", "projects", "calendar", "meetings", "team", "settings", "users"],
      "tasks_scope": "all",
      "can_manage_users": true,
      "can_manage_settings": true,
      "can_create_projects": true,
      "can_create_projects_via_dashboard": true,
      "can_create_projects_via_whatsapp": true,
      "can_manage_projects": true,
      "can_view_global_tasks": true,
      "can_create_global_tasks": true,
      "default_team_filter": "all",
      "default_category_filter": "all",
      "default_project_filter": "all"
    },
    "admin": {
      "dashboard_sections": ["summary", "global_tasks", "tasks", "projects", "calendar", "meetings", "team", "settings", "users"],
      "tasks_scope": "all",
      "can_manage_users": true,
      "can_manage_settings": true,
      "can_create_projects": true,
      "can_create_projects_via_dashboard": true,
      "can_create_projects_via_whatsapp": true,
      "can_manage_projects": true,
      "can_view_global_tasks": true,
      "can_create_global_tasks": true,
      "default_team_filter": "all",
      "default_category_filter": "all",
      "default_project_filter": "all"
    },
    "manager": {
      "dashboard_sections": ["summary", "global_tasks", "tasks", "projects", "calendar", "team"],
      "tasks_scope": "team",
      "can_manage_users": false,
      "can_manage_settings": false,
      "can_create_projects": true,
      "can_create_projects_via_dashboard": true,
      "can_create_projects_via_whatsapp": true,
      "can_manage_projects": false,
      "can_view_global_tasks": true,
      "can_create_global_tasks": false,
      "default_team_filter": "user_teams",
      "default_category_filter": "user_categories",
      "default_project_filter": "all"
    },
    "member": {
      "dashboard_sections": ["global_tasks", "tasks", "calendar"],
      "tasks_scope": "assigned",
      "can_manage_users": false,
      "can_manage_settings": false,
      "can_create_projects": false,
      "can_create_projects_via_dashboard": false,
      "can_create_projects_via_whatsapp": false,
      "can_manage_projects": false,
      "can_view_global_tasks": true,
      "can_create_global_tasks": false,
      "default_team_filter": "user_teams",
      "default_category_filter": "user_categories",
      "default_project_filter": "assigned_projects"
    }
  }'::jsonb,

  updated_at timestamptz not null default now()
);

create trigger organization_settings_set_updated_at
  before update on organization_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Bootstrap: create default settings when an org is inserted
-- ---------------------------------------------------------------------------

create or replace function bootstrap_organization_settings()
returns trigger
language plpgsql
as $$
begin
  insert into organization_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger organizations_bootstrap_settings
  after insert on organizations
  for each row execute function bootstrap_organization_settings();

-- ---------------------------------------------------------------------------
-- WhatsApp channels (one Twilio number per organization)
-- Webhook To → organization_id. Primary org resolution on inbound messages.
-- ---------------------------------------------------------------------------

create table organization_channels (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  provider         text not null default 'twilio',
  whatsapp_number  text not null,  -- E.164, Twilio WhatsApp "To" (e.g. whatsapp:+14155238886)
  display_name     text,           -- label for menus / redirect messages
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (whatsapp_number)
);

create index organization_channels_org_id_idx on organization_channels (organization_id);

create trigger organization_channels_set_updated_at
  before update on organization_channels
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Teams & categories (org-scoped taxonomy for users and dashboard filtering)
-- ---------------------------------------------------------------------------

create table teams (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  slug            text not null,
  description     text,
  color           text,  -- hex or token for dashboard chips
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (organization_id, slug),
  unique (organization_id, name)
);

create index teams_organization_id_idx on teams (organization_id);

create trigger teams_set_updated_at
  before update on teams
  for each row execute function set_updated_at();

create table categories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  slug            text not null,
  description     text,
  color           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (organization_id, slug),
  unique (organization_id, name)
);

create index categories_organization_id_idx on categories (organization_id);

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Users (dashboard accounts — separate from WhatsApp-linked people)
-- ---------------------------------------------------------------------------

create table users (
  id                          uuid primary key default gen_random_uuid(),
  email                       text not null unique,
  display_name                text not null,
  auth_user_id                uuid unique,  -- Supabase Auth user id when wired
  phone                       text,
  notification_email            text,       -- defaults to email when null (app layer)
  email_notifications_enabled boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Organization memberships (user ↔ org with role)
-- ---------------------------------------------------------------------------

create table organization_memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references users (id) on delete cascade,
  role            member_role not null default 'member',
  status          membership_status not null default 'active',

  -- Optional per-member overrides (null = use role_permissions defaults).
  dashboard_sections_override text[],
  tasks_scope_override          text check (tasks_scope_override in ('all', 'team', 'assigned')),
  can_create_projects_override  boolean,

  -- Default dashboard filter selections (null = use role default: user_teams / user_categories).
  primary_team_id     uuid references teams (id) on delete set null,
  primary_category_id uuid references categories (id) on delete set null,

  joined_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, user_id)
);

create index organization_memberships_user_id_idx
  on organization_memberships (user_id);

create index organization_memberships_org_role_idx
  on organization_memberships (organization_id, role);

create trigger organization_memberships_set_updated_at
  before update on organization_memberships
  for each row execute function set_updated_at();

-- Many-to-many: dashboard users ↔ teams / categories
create table membership_teams (
  membership_id uuid not null references organization_memberships (id) on delete cascade,
  team_id       uuid not null references teams (id) on delete cascade,
  primary key (membership_id, team_id)
);

create index membership_teams_team_id_idx on membership_teams (team_id);

create table membership_categories (
  membership_id uuid not null references organization_memberships (id) on delete cascade,
  category_id   uuid not null references categories (id) on delete cascade,
  primary key (membership_id, category_id)
);

create index membership_categories_category_id_idx on membership_categories (category_id);

-- ---------------------------------------------------------------------------
-- Invitations (register users via shareable link)
-- ---------------------------------------------------------------------------

create table invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email           text not null,
  role            member_role not null default 'member',
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by      uuid references users (id) on delete set null,
  status          invitation_status not null default 'pending',
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,
  accepted_by     uuid references users (id) on delete set null,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index invitations_org_email_idx
  on invitations (organization_id, email);

create index invitations_token_idx
  on invitations (token)
  where status = 'pending';

-- One active pending invite per email per org.
create unique index invitations_one_pending_per_email
  on invitations (organization_id, lower(email))
  where status = 'pending';

-- Pre-assign teams/categories when the invite is accepted.
create table invitation_teams (
  invitation_id uuid not null references invitations (id) on delete cascade,
  team_id       uuid not null references teams (id) on delete cascade,
  primary key (invitation_id, team_id)
);

create table invitation_categories (
  invitation_id uuid not null references invitations (id) on delete cascade,
  category_id   uuid not null references categories (id) on delete cascade,
  primary key (invitation_id, category_id)
);

-- ---------------------------------------------------------------------------
-- People (WhatsApp-linked team members, scoped to an organization)
-- ---------------------------------------------------------------------------

create table people (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  display_name     text not null,
  whatsapp_number  text not null,
  role_label       text,  -- free-text job title (not the dashboard member_role)
  user_id          uuid references users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, whatsapp_number)
);

create index people_organization_id_idx on people (organization_id);
create index people_user_id_idx on people (user_id) where user_id is not null;

create trigger people_set_updated_at
  before update on people
  for each row execute function set_updated_at();

create table people_teams (
  people_id uuid not null references people (id) on delete cascade,
  team_id   uuid not null references teams (id) on delete cascade,
  primary key (people_id, team_id)
);

create index people_teams_team_id_idx on people_teams (team_id);

create table people_categories (
  people_id   uuid not null references people (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  primary key (people_id, category_id)
);

create index people_categories_category_id_idx on people_categories (category_id);

-- ---------------------------------------------------------------------------
-- WhatsApp sessions (welcome menu + org validation state per sender)
-- Validates people(sender) belongs to the org resolved from organization_channels.
-- ---------------------------------------------------------------------------

create table whatsapp_sessions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  channel_id       uuid not null references organization_channels (id) on delete cascade,
  sender_phone     text not null,
  people_id        uuid references people (id) on delete set null,
  status           whatsapp_session_status not null default 'awaiting_welcome',
  expires_at       timestamptz not null default (now() + interval '7 days'),
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index whatsapp_sessions_open
  on whatsapp_sessions (organization_id, sender_phone)
  where status in ('awaiting_welcome', 'awaiting_org_redirect', 'active');

create index whatsapp_sessions_sender_idx on whatsapp_sessions (sender_phone);

create trigger whatsapp_sessions_set_updated_at
  before update on whatsapp_sessions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Projects (group tasks; creation gated by role + channel in app/n8n layer)
-- ---------------------------------------------------------------------------

create table projects (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations (id) on delete cascade,
  team_id              uuid references teams (id) on delete set null,
  name                 text not null,
  slug                 text not null,
  description          text,
  status               project_status not null default 'active',
  start_date           date,
  end_date             date,
  created_by_user_id   uuid references users (id) on delete set null,
  created_by_people_id uuid references people (id) on delete set null,
  created_via          project_channel not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  unique (organization_id, slug),
  unique (organization_id, name),

  check (
    (created_via = 'dashboard' and created_by_user_id is not null)
    or (created_via = 'whatsapp' and created_by_people_id is not null)
    or (created_via = 'meeting')
  )
);

create index projects_organization_id_idx on projects (organization_id);
create index projects_status_idx on projects (organization_id, status);
create index projects_team_id_idx on projects (organization_id, team_id) where team_id is not null;

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- Projects can span multiple categories (e.g. taller = Nutrición + Educación).
create table project_categories (
  project_id   uuid not null references projects (id) on delete cascade,
  category_id  uuid not null references categories (id) on delete cascade,
  is_primary   boolean not null default false,
  primary key (project_id, category_id)
);

create index project_categories_category_id_idx on project_categories (category_id);

-- At most one primary category per project (used for defaults / task inheritance).
create unique index project_categories_one_primary
  on project_categories (project_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- Inbound messages (append-only log from messaging edge)
-- ---------------------------------------------------------------------------

create table inbound_messages (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations (id) on delete cascade,
  provider             text not null default 'twilio',
  provider_message_id  text,
  sender_phone         text not null,
  sender_name          text,
  body                 text,
  media_url            text,
  received_at          timestamptz not null default now(),
  raw_payload          jsonb,

  unique (organization_id, provider, provider_message_id)
);

create index inbound_messages_org_received_idx
  on inbound_messages (organization_id, received_at desc);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table tasks (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations (id) on delete cascade,
  -- Nullable: many tasks are ad-hoc and live outside any project.
  project_id          uuid references projects (id) on delete set null,
  -- Org-wide tasks: visible to all members; never tied to a project.
  is_global           boolean not null default false,
  team_id             uuid references teams (id) on delete set null,
  category_id         uuid references categories (id) on delete set null,
  owner_id            uuid references people (id) on delete set null,
  owner_name          text,
  task_title          text not null,
  description         text,
  due_date            date,
  status              task_status not null default 'pending',
  priority            task_priority not null default 'normal',
  source_message_id   uuid references inbound_messages (id) on delete set null,
  source_type         text check (source_type in ('whatsapp', 'meeting', 'manual')),
  source_text         text,
  confidence          numeric(3, 2) check (confidence >= 0 and confidence <= 1),
  extraction_payload  jsonb,
  -- Idempotency: prevents duplicate tasks on webhook retry / double confirm.
  -- Convention: task:msg:{inbound_id} | task:draft:{draft_id} | recurrence:{id}:{date}
  idempotency_key     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  check (not is_global or project_id is null)
);

create unique index tasks_idempotency_key
  on tasks (organization_id, idempotency_key)
  where idempotency_key is not null;

create index tasks_organization_id_idx on tasks (organization_id);
create index tasks_status_idx on tasks (organization_id, status);
create index tasks_due_date_idx on tasks (organization_id, due_date);
create index tasks_owner_name_idx on tasks (organization_id, owner_name);
create index tasks_owner_id_idx on tasks (owner_id) where owner_id is not null;
create index tasks_project_id_idx on tasks (organization_id, project_id) where project_id is not null;
create index tasks_standalone_idx on tasks (organization_id, category_id)
  where project_id is null and not is_global;
create index tasks_global_idx on tasks (organization_id, status)
  where is_global;
create index tasks_project_category_idx on tasks (organization_id, project_id, category_id);
create index tasks_team_category_idx on tasks (organization_id, team_id, category_id);

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Meetings
-- ---------------------------------------------------------------------------

create table meetings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id      uuid references projects (id) on delete set null,
  team_id         uuid references teams (id) on delete set null,
  category_id     uuid references categories (id) on delete set null,
  title           text not null,
  transcript      text,
  summary         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index meetings_organization_id_idx on meetings (organization_id);
create index meetings_project_id_idx on meetings (organization_id, project_id) where project_id is not null;
create index meetings_team_category_idx on meetings (organization_id, team_id, category_id);

create trigger meetings_set_updated_at
  before update on meetings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Meeting ↔ task join
-- ---------------------------------------------------------------------------

create table meeting_tasks (
  meeting_id uuid not null references meetings (id) on delete cascade,
  task_id    uuid not null references tasks (id) on delete cascade,
  primary key (meeting_id, task_id)
);

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------

create table reminders (
  id                    uuid primary key default gen_random_uuid(),
  task_id               uuid not null references tasks (id) on delete cascade,
  scheduled_at          timestamptz not null,
  sent_at               timestamptz,
  response              text,
  response_received_at  timestamptz,
  -- Idempotency: reminder:send:{id} checked before Twilio outbound
  idempotency_key       text not null unique,
  twilio_message_sid    text,
  created_at            timestamptz not null default now()
);

create index reminders_task_id_idx on reminders (task_id);

create index reminders_due_unsent_idx
  on reminders (scheduled_at)
  where sent_at is null;

-- ---------------------------------------------------------------------------
-- Task recurrences (templates) + occurrences (idempotent instances)
-- ---------------------------------------------------------------------------

create table task_recurrences (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations (id) on delete cascade,
  title_template       text not null,
  project_id           uuid references projects (id) on delete set null,
  team_id              uuid references teams (id) on delete set null,
  category_id          uuid references categories (id) on delete set null,
  owner_id             uuid references people (id) on delete set null,
  is_global            boolean not null default false,
  interval_unit        recurrence_interval not null,
  interval_count       integer not null default 1 check (interval_count > 0),
  status               recurrence_status not null default 'suggested',
  next_occurrence_on   date,
  suggested_from_task_id uuid references tasks (id) on delete set null,
  created_by_user_id   uuid references users (id) on delete set null,
  created_by_people_id uuid references people (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  check (not is_global or project_id is null)
);

create index task_recurrences_org_status_idx
  on task_recurrences (organization_id, status);

create trigger task_recurrences_set_updated_at
  before update on task_recurrences
  for each row execute function set_updated_at();

create table recurrence_occurrences (
  id              uuid primary key default gen_random_uuid(),
  recurrence_id   uuid not null references task_recurrences (id) on delete cascade,
  occurrence_on   date not null,
  task_id         uuid references tasks (id) on delete set null,
  idempotency_key text not null,
  created_at      timestamptz not null default now(),

  unique (recurrence_id, occurrence_on),
  unique (idempotency_key)
);

create index recurrence_occurrences_date_idx
  on recurrence_occurrences (recurrence_id, occurrence_on);

-- ---------------------------------------------------------------------------
-- Proactive outbound WhatsApp (bot speaks first — idempotent sends)
-- ---------------------------------------------------------------------------

create table proactive_outreach (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations (id) on delete cascade,
  channel_id        uuid not null references organization_channels (id) on delete cascade,
  people_id         uuid not null references people (id) on delete cascade,
  outreach_type     outreach_type not null,
  idempotency_key   text not null,
  task_id           uuid references tasks (id) on delete set null,
  recurrence_id     uuid references task_recurrences (id) on delete set null,
  occurrence_id     uuid references recurrence_occurrences (id) on delete set null,
  body_template     text,
  payload           jsonb,
  scheduled_at      timestamptz not null,
  sent_at           timestamptz,
  twilio_message_sid text,
  status            outreach_status not null default 'scheduled',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (organization_id, idempotency_key)
);

create index proactive_outreach_due_idx
  on proactive_outreach (scheduled_at)
  where status = 'scheduled';

create index proactive_outreach_people_idx
  on proactive_outreach (people_id, scheduled_at desc);

create trigger proactive_outreach_set_updated_at
  before update on proactive_outreach
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Org consistency: scoped FKs must belong to the same organization
-- ---------------------------------------------------------------------------

create or replace function assert_org_scoped_fk()
returns trigger
language plpgsql
as $$
declare
  fk_org uuid;
begin
  if tg_table_name = 'projects' then
    if new.team_id is not null then
      select organization_id into fk_org from teams where id = new.team_id;
      if fk_org is distinct from new.organization_id then
        raise exception 'projects.team_id must belong to the same organization';
      end if;
    end if;
  elsif tg_table_name in ('tasks', 'meetings') then
    if new.team_id is not null then
      select organization_id into fk_org from teams where id = new.team_id;
      if fk_org is distinct from new.organization_id then
        raise exception '%.team_id must belong to the same organization', tg_table_name;
      end if;
    end if;
    if new.category_id is not null then
      select organization_id into fk_org from categories where id = new.category_id;
      if fk_org is distinct from new.organization_id then
        raise exception '%.category_id must belong to the same organization', tg_table_name;
      end if;
    end if;
    if new.project_id is not null then
      select organization_id into fk_org from projects where id = new.project_id;
      if fk_org is distinct from new.organization_id then
        raise exception '%.project_id must belong to the same organization', tg_table_name;
      end if;
    end if;
  elsif tg_table_name = 'organization_memberships' then
    if new.primary_team_id is not null then
      select organization_id into fk_org from teams where id = new.primary_team_id;
      if fk_org is distinct from new.organization_id then
        raise exception 'organization_memberships.primary_team_id must belong to the same organization';
      end if;
    end if;
    if new.primary_category_id is not null then
      select organization_id into fk_org from categories where id = new.primary_category_id;
      if fk_org is distinct from new.organization_id then
        raise exception 'organization_memberships.primary_category_id must belong to the same organization';
      end if;
    end if;
  elsif tg_table_name = 'whatsapp_sessions' then
    select organization_id into fk_org from organization_channels where id = new.channel_id;
    if fk_org is distinct from new.organization_id then
      raise exception 'whatsapp_sessions.channel_id must belong to the same organization';
    end if;
    if new.people_id is not null then
      select organization_id into fk_org from people where id = new.people_id;
      if fk_org is distinct from new.organization_id then
        raise exception 'whatsapp_sessions.people_id must belong to the same organization';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_assert_org_scoped_fk
  before insert or update on tasks
  for each row execute function assert_org_scoped_fk();

create trigger meetings_assert_org_scoped_fk
  before insert or update on meetings
  for each row execute function assert_org_scoped_fk();

create trigger organization_memberships_assert_org_scoped_fk
  before insert or update on organization_memberships
  for each row execute function assert_org_scoped_fk();

create trigger whatsapp_sessions_assert_org_scoped_fk
  before insert or update on whatsapp_sessions
  for each row execute function assert_org_scoped_fk();

create trigger projects_assert_org_scoped_fk
  before insert or update on projects
  for each row execute function assert_org_scoped_fk();

-- Inherit team + primary category from project when task is linked and tags are omitted.
create or replace function inherit_task_project_tags()
returns trigger
language plpgsql
as $$
declare
  p_team uuid;
  p_category uuid;
begin
  if new.project_id is null then
    return new;
  end if;

  -- Global tasks never inherit from a project (and cannot have project_id).
  if new.is_global then
    return new;
  end if;

  select p.team_id
    into p_team
  from projects p
  where p.id = new.project_id;

  select pc.category_id
    into p_category
  from project_categories pc
  where pc.project_id = new.project_id
    and pc.is_primary
  limit 1;

  -- Fallback: single category on project when no primary is flagged.
  if p_category is null then
    select pc.category_id
      into p_category
    from project_categories pc
    where pc.project_id = new.project_id
    limit 1;
  end if;

  if new.team_id is null then
    new.team_id := p_team;
  end if;
  if new.category_id is null then
    new.category_id := p_category;
  end if;

  return new;
end;
$$;

create trigger tasks_inherit_project_tags
  before insert or update on tasks
  for each row execute function inherit_task_project_tags();

-- ---------------------------------------------------------------------------
-- Task drafts (multi-turn WhatsApp: project disambiguation before insert)
-- ---------------------------------------------------------------------------

create table task_drafts (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations (id) on delete cascade,
  source_message_id    uuid references inbound_messages (id) on delete set null,
  sender_phone         text not null,
  people_id            uuid references people (id) on delete set null,
  extraction_payload   jsonb not null,
  offered_projects     jsonb not null default '[]'::jsonb,
  status               task_draft_status not null default 'awaiting_project_choice',
  expires_at           timestamptz not null default (now() + interval '24 hours'),
  resolved_task_id     uuid references tasks (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index task_drafts_sender_pending_idx
  on task_drafts (organization_id, sender_phone)
  where status = 'awaiting_project_choice';

-- One pending project-disambiguation draft per sender per org.
create unique index task_drafts_one_pending
  on task_drafts (organization_id, sender_phone)
  where status = 'awaiting_project_choice';

create trigger task_drafts_set_updated_at
  before update on task_drafts
  for each row execute function set_updated_at();

-- project_categories: category must belong to the same org as the project.
create or replace function assert_project_category_org()
returns trigger
language plpgsql
as $$
declare
  proj_org uuid;
  cat_org uuid;
begin
  select organization_id into proj_org from projects where id = new.project_id;
  select organization_id into cat_org from categories where id = new.category_id;
  if proj_org is distinct from cat_org then
    raise exception 'project_categories: category must belong to the project organization';
  end if;
  return new;
end;
$$;

create trigger project_categories_assert_org
  before insert or update on project_categories
  for each row execute function assert_project_category_org();

-- ---------------------------------------------------------------------------
-- Row-level security (Supabase) — enable when wiring auth
-- ---------------------------------------------------------------------------
-- alter table organizations enable row level security;
-- alter table organization_settings enable row level security;
-- alter table users enable row level security;
-- alter table organization_memberships enable row level security;
-- Policies: scope every query by organization_id from JWT / membership.
