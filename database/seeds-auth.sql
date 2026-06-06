-- Supabase Auth demo users (run AFTER schema.sql + seeds.sql)
-- SQL Editor de Supabase o: psql $DATABASE_URL -f database/seeds-auth.sql
--
-- Credenciales:
--   admin@esperanza.org / admin  → owner (Laura)
--   user@esperanza.org  / user   → member (Ana)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_auth_id uuid := '11111111-1111-1111-1111-111111111101';
  user_auth_id  uuid := '11111111-1111-1111-1111-111111111102';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    admin_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@esperanza.org',
    crypt('admin', gen_salt('bf')),
    now(), now(), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Admin Demo"}'::jsonb,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    updated_at = now();

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    admin_auth_id,
    'admin@esperanza.org',
    'email',
    jsonb_build_object('sub', admin_auth_id::text, 'email', 'admin@esperanza.org'),
    now(), now(), now()
  )
  ON CONFLICT (provider_id, provider) DO NOTHING;

  UPDATE public.users
  SET email = 'admin@esperanza.org', display_name = 'Admin Demo', auth_user_id = admin_auth_id
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    user_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user@esperanza.org',
    crypt('user', gen_salt('bf')),
    now(), now(), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"User Demo"}'::jsonb,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    updated_at = now();

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    user_auth_id,
    'user@esperanza.org',
    'email',
    jsonb_build_object('sub', user_auth_id::text, 'email', 'user@esperanza.org'),
    now(), now(), now()
  )
  ON CONFLICT (provider_id, provider) DO NOTHING;

  UPDATE public.users
  SET email = 'user@esperanza.org', display_name = 'User Demo', auth_user_id = user_auth_id
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
END $$;
