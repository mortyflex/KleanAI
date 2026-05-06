-- Klean AI — explicit table grants and revokes (idempotent).
--
-- Why this file exists
-- --------------------
-- The Supabase project has "Automatically expose new tables" DISABLED in
-- Project Settings → API. With that off, Supabase no longer installs the
-- usual `ALTER DEFAULT PRIVILEGES` rules for newly created tables, so two
-- things must be handled explicitly here:
--
--   (a) Grant the minimum CRUD set on every Klean AI table to the
--       `authenticated` role.
--   (b) Revoke ALL privileges on those tables from `PUBLIC` and from
--       `anon` so that no role can read, write, reference, trigger, or
--       truncate them.
--
-- Why we revoke from PUBLIC (not just from anon)
-- ----------------------------------------------
-- PostgreSQL has a pseudo-role named `PUBLIC` that represents every role
-- in the cluster. Any privilege held by `PUBLIC` is automatically
-- inherited by `anon`, `authenticated`, and every other role — there is
-- no way to opt out of the inheritance per-role. Revoking from `anon`
-- alone is therefore not enough: as long as `PUBLIC` retains a privilege,
-- `anon` keeps it via inheritance.
--
-- This is exactly what we observed before this fix: `anon` still had
-- REFERENCES / TRIGGER / TRUNCATE on every Klean AI table because those
-- privileges were sitting on `PUBLIC`. We therefore revoke ALL from
-- `PUBLIC` first, then revoke ALL from `anon` as belt-and-braces, then
-- grant only the CRUD set to `authenticated`.
--
-- Safety
-- ------
-- - We never grant anything table-level to `anon`. Every Klean AI table
--   holds private per-user data; an unauthenticated visitor must not be
--   able to touch any of it. Even with RLS as a second line of defense,
--   we want zero direct privileges on these tables.
-- - We never use `service_role` from the mobile client. It bypasses RLS
--   and is only injected into Edge Functions.
-- - Granting CRUD does NOT weaken RLS — Postgres checks GRANT first, then
--   evaluates row-level policies. Without a GRANT, RLS is moot; without
--   RLS, a GRANT is dangerous. We need both.
-- - We deliberately do NOT grant `REFERENCES` / `TRIGGER` / `TRUNCATE` to
--   `authenticated`. End users must never be able to alter the schema or
--   wipe their own table contents.
--
-- Idempotency
-- -----------
-- GRANT and REVOKE are both naturally idempotent — re-running has no
-- effect and no error. This file is safe to apply any number of times.

-- Schema usage ------------------------------------------------------------
--
-- `anon` and `authenticated` both need USAGE on the `public` schema so
-- PostgREST can introspect tables and route requests. USAGE alone does
-- not allow reading any data — that requires per-table privileges, which
-- `anon` is denied below.

grant usage on schema public to anon, authenticated;

-- 1. Strip every privilege from PUBLIC ------------------------------------
--
--    Must come BEFORE the revokes from `anon`, otherwise `anon` keeps
--    the inherited privileges no matter how many times we revoke from it
--    directly.

revoke all privileges on public.profiles              from public;
revoke all privileges on public.goals                 from public;
revoke all privileges on public.training_preferences  from public;
revoke all privileges on public.diet_preferences      from public;
revoke all privileges on public.programs              from public;
revoke all privileges on public.workout_sessions      from public;
revoke all privileges on public.workout_logs          from public;
revoke all privileges on public.nutrition_plans       from public;
revoke all privileges on public.daily_nutrition_logs  from public;
revoke all privileges on public.smoothing_events      from public;

-- 2. Strip every privilege from `anon` ------------------------------------
--
--    Defense-in-depth in case anon was directly granted privileges by an
--    earlier setup (Supabase defaults, manual GRANTs, etc.). Pairs with
--    the PUBLIC revoke above so neither path leaves residue.

revoke all privileges on public.profiles              from anon;
revoke all privileges on public.goals                 from anon;
revoke all privileges on public.training_preferences  from anon;
revoke all privileges on public.diet_preferences      from anon;
revoke all privileges on public.programs              from anon;
revoke all privileges on public.workout_sessions      from anon;
revoke all privileges on public.workout_logs          from anon;
revoke all privileges on public.nutrition_plans       from anon;
revoke all privileges on public.daily_nutrition_logs  from anon;
revoke all privileges on public.smoothing_events      from anon;

-- 3. Strip every privilege from `authenticated` ---------------------------
--
--    Why we revoke before granting:
--    Supabase historically ran `GRANT ALL ON TABLES TO authenticated` by
--    default at table creation. That gave `authenticated` not just CRUD
--    but also REFERENCES / TRIGGER / TRUNCATE. Disabling "Automatically
--    expose new tables" prevents NEW such grants but does NOT revoke
--    existing ones. We must explicitly revoke to clear the residue, then
--    re-grant only the minimum CRUD set in step 4 below.
--
--    End users must NEVER hold REFERENCES (would let them add FKs to
--    other tables), TRIGGER (would let them attach arbitrary triggers),
--    or TRUNCATE (would let them wipe a whole table, bypassing RLS row
--    checks since TRUNCATE is not row-level).

revoke all privileges on public.profiles              from authenticated;
revoke all privileges on public.goals                 from authenticated;
revoke all privileges on public.training_preferences  from authenticated;
revoke all privileges on public.diet_preferences      from authenticated;
revoke all privileges on public.programs              from authenticated;
revoke all privileges on public.workout_sessions      from authenticated;
revoke all privileges on public.workout_logs          from authenticated;
revoke all privileges on public.nutrition_plans       from authenticated;
revoke all privileges on public.daily_nutrition_logs  from authenticated;
revoke all privileges on public.smoothing_events      from authenticated;

-- 4. Grant the minimum CRUD surface to `authenticated` --------------------
--
--    Explicit list (no `grant all`) so REFERENCES / TRIGGER / TRUNCATE
--    are never re-granted to end users.

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
