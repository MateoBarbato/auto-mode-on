-- Halketon — dev-only database reset
-- Wipes the public schema so schema.sql can run cleanly on an existing database.
-- WARNING: destroys all data. Never run in production.
--
-- Usage (Supabase SQL editor or psql):
--   1. database/reset.sql
--   2. database/schema.sql
--   3. database/seeds.sql

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres;
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

grant all on schema public to postgres;
grant all on schema public to anon;
grant all on schema public to authenticated;
grant all on schema public to service_role;
