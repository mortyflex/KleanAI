-- Klean AI — explicit table grants for the `authenticated` role.
--
-- Why this file exists
-- --------------------
-- The Supabase project has "Automatically expose new tables" DISABLED in
-- Project Settings → API. With that off, Supabase does NOT install the
-- usual `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon,
-- authenticated, ...` rule for newly created tables. As a result:
--
--   - PostgREST receives a bare `permission denied for table X` error
--     from Postgres BEFORE any RLS policy is evaluated.
--   - Tables look "locked" to the client even though RLS is correctly set.
--
-- We therefore grant table privileges explicitly, ONLY to the role we
-- actually want to expose data to: `authenticated`.
--
-- Safety
-- ------
-- - We never grant to `anon`. Every Klean AI table holds private per-user
--   data; an unauthenticated visitor must not read or write any of it.
--   RLS would still block them, but defense-in-depth: no GRANT, no risk.
-- - We never use `service_role` from the mobile client. The `service_role`
--   key bypasses RLS and is only injected into Edge Functions.
-- - Granting CRUD does NOT weaken RLS — Postgres checks GRANT first, then
--   evaluates the row-level policies on top. Without a GRANT, RLS is
--   moot; without RLS, GRANT is dangerous. We need both.
--
-- Idempotency
-- -----------
-- `GRANT` is naturally idempotent: re-applying the same grant has no
-- effect, no error. This file is safe to run any number of times.

-- Schema usage (likely already granted by Supabase, but harmless to repeat).
grant usage on schema public to authenticated;

-- Per-table CRUD grants. We do NOT use `grant all` to keep the surface
-- explicit and to avoid silently granting TRUNCATE / REFERENCES / TRIGGER.
grant select, insert, update, delete on public.profiles              to authenticated;
grant select, insert, update, delete on public.goals                 to authenticated;
grant select, insert, update, delete on public.training_preferences  to authenticated;
grant select, insert, update, delete on public.diet_preferences      to authenticated;
grant select, insert, update, delete on public.programs              to authenticated;
grant select, insert, update, delete on public.workout_sessions      to authenticated;
grant select, insert, update, delete on public.workout_logs          to authenticated;
grant select, insert, update, delete on public.nutrition_plans       to authenticated;
grant select, insert, update, delete on public.daily_nutrition_logs  to authenticated;
grant select, insert, update, delete on public.smoothing_events      to authenticated;
