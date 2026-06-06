-- Halketon — demo seed data (multi-organization)
-- Run after schema: psql $DATABASE_URL -f database/seeds.sql

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

insert into organizations (id, name, slug, status) values
  ('11111111-1111-1111-1111-111111111111', 'Fundación Esperanza', 'fundacion-esperanza', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Red Comunitaria Norte', 'red-comunitaria-norte', 'active');

-- organization_settings rows are auto-created by trigger; customize one org:
update organization_settings
set features = features || '{"beneficiary_tracking": true}'::jsonb
where organization_id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
-- WhatsApp channels (one Twilio number per org)
-- ---------------------------------------------------------------------------

insert into organization_channels (id, organization_id, whatsapp_number, display_name) values
  ('ch111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'whatsapp:+14155238886', 'Fundación Esperanza'),
  ('ch222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'whatsapp:+14155238887', 'Red Comunitaria Norte');

-- ---------------------------------------------------------------------------
-- Teams & categories (Fundación Esperanza)
-- ---------------------------------------------------------------------------

insert into teams (id, organization_id, name, slug, description, color) values
  ('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Coordinación', 'coordinacion', 'Equipo de coordinación general', '#2563eb'),
  ('f1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Territorio',     'territorio',     'Trabajo en territorio',          '#16a34a'),
  ('f1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Voluntariado',   'voluntariado',   'Voluntarios y talleristas',      '#9333ea');

insert into categories (id, organization_id, name, slug, description, color) values
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Nutrición',       'nutricion',       'Programa de nutrición comunitaria', '#ea580c'),
  ('e1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Educación',       'educacion',       'Talleres y capacitaciones',         '#0891b2'),
  ('e1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Administración',  'administracion',  'Informes, financiadores, gestión',  '#64748b');

-- Red Comunitaria Norte (single team + category for demo)
insert into teams (id, organization_id, name, slug) values
  ('f2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Operaciones', 'operaciones');

insert into categories (id, organization_id, name, slug) values
  ('e2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Impacto', 'impacto');

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

insert into users (id, email, display_name, notification_email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'directora@esperanza.org', 'Laura Méndez', 'directora@esperanza.org'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'coord@esperanza.org', 'Mateo Barbato', 'coord@esperanza.org'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'voluntaria@esperanza.org', 'Ana Ruiz', 'voluntaria@esperanza.org'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin@rednorte.org', 'Carlos Vega', 'admin@rednorte.org');

-- ---------------------------------------------------------------------------
-- Memberships (role hierarchy)
-- ---------------------------------------------------------------------------

insert into organization_memberships (id, organization_id, user_id, role, status, joined_at, tasks_scope_override, primary_team_id, primary_category_id) values
  ('m1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner',   'active', now() - interval '90 days', null, 'f1111111-1111-1111-1111-111111111111', null),
  ('m1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager', 'active', now() - interval '60 days', 'team', 'f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111113'),
  ('m1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'member',  'active', now() - interval '30 days', null, 'f1111111-1111-1111-1111-111111111113', 'e1111111-1111-1111-1111-111111111111'),
  ('m2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner',   'active', now() - interval '45 days', null, 'f2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222');

-- Membership ↔ teams / categories
insert into membership_teams (membership_id, team_id) values
  ('m1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111'),
  ('m1111111-1111-1111-1111-111111111112', 'f1111111-1111-1111-1111-111111111111'),
  ('m1111111-1111-1111-1111-111111111113', 'f1111111-1111-1111-1111-111111111113');

insert into membership_categories (membership_id, category_id) values
  ('m1111111-1111-1111-1111-111111111112', 'e1111111-1111-1111-1111-111111111113'),
  ('m1111111-1111-1111-1111-111111111113', 'e1111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Pending invitation (shareable link demo)
-- Token is fixed for reproducible demos: /invite/demo-invite-token-esperanza
-- ---------------------------------------------------------------------------

insert into invitations (id, organization_id, email, role, token, invited_by, status, expires_at) values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    'nuevo@esperanza.org',
    'member',
    'demo-invite-token-esperanza',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'pending',
    now() + interval '7 days'
  );

insert into invitation_teams (invitation_id, team_id) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'f1111111-1111-1111-1111-111111111113');

insert into invitation_categories (invitation_id, category_id) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'e1111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- People (WhatsApp-linked, linked to dashboard users where applicable)
-- ---------------------------------------------------------------------------

insert into people (id, organization_id, display_name, whatsapp_number, role_label, user_id) values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Mateo',  '+5491112345678', 'Coordinador', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Ana',    '+5491187654321', 'Voluntaria',  'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Laura',  '+5491155555555', 'Directora',   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Carlos', '+5491144444444', 'Admin',       'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  -- Same phone in two orgs (edge case): must use the correct Twilio number per org
  ('a3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Mateo',  '+5491112345678', 'Consultor externo', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into people_teams (people_id, team_id) values
  ('a1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111'),
  ('a1111111-1111-1111-1111-111111111112', 'f1111111-1111-1111-1111-111111111113'),
  ('a1111111-1111-1111-1111-111111111113', 'f1111111-1111-1111-1111-111111111111'),
  ('a2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222');

insert into people_categories (people_id, category_id) values
  ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111113'),
  ('a1111111-1111-1111-1111-111111111112', 'e1111111-1111-1111-1111-111111111111'),
  ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222');

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

insert into projects (
  id, organization_id, team_id, name, slug, description, status,
  start_date, end_date, created_by_user_id, created_by_people_id, created_via
) values
  (
    'p1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    'Informe financiador Q2',
    'informe-financiador-q2',
    'Entrega de informe trimestral al financiador principal',
    'active',
    current_date - interval '14 days',
    current_date + interval '30 days',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    null,
    'dashboard'
  ),
  (
    'p1111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111113',
    'Taller nutrición comunitaria',
    'taller-nutricion-comunitaria',
    'Ciclo de talleres en barrios del sur — cruza nutrición y educación',
    'active',
    current_date - interval '7 days',
    current_date + interval '60 days',
    null,
    'a1111111-1111-1111-1111-111111111111',
    'whatsapp'
  ),
  (
    'p2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'f2222222-2222-2222-2222-222222222222',
    'Registro de impacto 2026',
    'registro-impacto-2026',
    null,
    'planning',
    null,
    null,
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    null,
    'dashboard'
  );

-- Multi-category projects (Taller = Nutrición + Educación)
insert into project_categories (project_id, category_id, is_primary) values
  ('p1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111113', true),
  ('p1111111-1111-1111-1111-111111111112', 'e1111111-1111-1111-1111-111111111111', true),
  ('p1111111-1111-1111-1111-111111111112', 'e1111111-1111-1111-1111-111111111112', false),
  ('p2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', true);

-- ---------------------------------------------------------------------------
-- Inbound messages
-- ---------------------------------------------------------------------------

insert into inbound_messages (id, organization_id, provider, provider_message_id, sender_phone, sender_name, body, received_at) values
  (
    'b1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'twilio',
    'SM001',
    '+5491112345678',
    'Mateo',
    'Yo me encargo del informe para el viernes',
    now() - interval '2 days'
  );

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

insert into tasks (
  id, organization_id, project_id, team_id, category_id, owner_id, owner_name, task_title, description,
  due_date, status, priority, source_message_id, source_type, source_text, confidence
) values
  (
    'c1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'p1111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111113',
    'a1111111-1111-1111-1111-111111111111',
    'Mateo',
    'Preparar informe',
    'Informe mensual para financiador',
    current_date + interval '3 days',
    'pending',
    'high',
    'b1111111-1111-1111-1111-111111111111',
    'whatsapp',
    'Yo me encargo del informe para el viernes',
    0.94
  ),
  (
    'c1111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'p1111111-1111-1111-1111-111111111112',
    'f1111111-1111-1111-1111-111111111113',
    'e1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111112',
    'Ana',
    'Coordinar taller de nutrición',
    null,
    current_date - interval '1 day',
    'in_progress',
    'normal',
    null,
    'manual',
    null,
    null
  ),
  -- Standalone task: no project_id (ad-hoc / fuera de proyectos formales)
  (
    'c1111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111111',
    null,
    'f1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111113',
    'a1111111-1111-1111-1111-111111111113',
    'Laura',
    'Renovar certificado SSL del sitio web',
    'Vencimiento estatutario — no pertenece a ningún proyecto',
    current_date + interval '14 days',
    'pending',
    'urgent',
    null,
    'manual',
    null,
    null
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'p2222222-2222-2222-2222-222222222222',
    'f2222222-2222-2222-2222-222222222222',
    'e2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'Carlos',
    'Cargar actividades del mes',
    null,
    current_date + interval '5 days',
    'pending',
    'normal',
    null,
    'manual',
    null,
    null
  );

-- Global task: reflects on the whole organization (visible to all roles)
insert into tasks (
  id, organization_id, project_id, is_global, team_id, category_id, owner_id, owner_name,
  task_title, description, due_date, status, priority, source_type
) values (
  'c1111111-1111-1111-1111-111111111115',
  '11111111-1111-1111-1111-111111111111',
  null,
  true,
  null,
  'e1111111-1111-1111-1111-111111111113',
  'a1111111-1111-1111-1111-111111111113',
  'Laura',
  'Renovar personería jurídica de la fundación',
  'Trámite institucional que afecta a toda la organización',
  current_date + interval '45 days',
  'pending',
  'high',
  'manual'
);

-- ---------------------------------------------------------------------------
-- Meeting + linked task
-- ---------------------------------------------------------------------------

insert into meetings (id, organization_id, project_id, team_id, category_id, title, transcript, summary) values
  (
    'd1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'p1111111-1111-1111-1111-111111111112',
    'f1111111-1111-1111-1111-111111111113',
    'e1111111-1111-1111-1111-111111111111',
    'Reunión semanal equipo',
    'Laura: Ana, ¿podés confirmar el espacio para el taller? Ana: Sí, lo hago mañana.',
    'Se acordó confirmar el espacio del taller de nutrición.'
  );

insert into meeting_tasks (meeting_id, task_id) values
  ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112');

-- ---------------------------------------------------------------------------
-- Reminder (due, not yet sent)
-- ---------------------------------------------------------------------------

insert into reminders (task_id, scheduled_at, idempotency_key) values
  ('c1111111-1111-1111-1111-111111111112', now() + interval '1 hour', 'reminder:send:c1111111-1111-1111-1111-111111111112:initial');

-- Second task in multi-category project, tagged under Educación
insert into tasks (
  id, organization_id, project_id, team_id, category_id, owner_id, owner_name,
  task_title, due_date, status, priority, source_type
) values (
  'c1111111-1111-1111-1111-111111111113',
  '11111111-1111-1111-1111-111111111111',
  'p1111111-1111-1111-1111-111111111112',
  'f1111111-1111-1111-1111-111111111113',
  'e1111111-1111-1111-1111-111111111112',
  'a1111111-1111-1111-1111-111111111112',
  'Ana',
  'Diseñar material educativo del taller',
  current_date + interval '10 days',
  'pending',
  'normal',
  'manual'
);
