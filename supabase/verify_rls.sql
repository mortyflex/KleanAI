-- Klean AI — RLS / policies / grants verification script.
--
-- This file is NOT a migration. It is a diagnostic script you run from the
-- Supabase SQL editor (as the default `postgres` role) any time you want
-- to sanity-check that the schema, policies, and grants are in the state
-- the app expects.
--
-- Each section prints a result set. The expected outcome for each section
-- is described in the comment immediately above the query.

-- 1. RLS is enabled on every Klean AI table --------------------------------
--    Expected: 10 rows, every `rls_enabled` = true.

select n.nspname        as schema,
       c.relname        as table_name,
       c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles','goals','training_preferences','diet_preferences',
    'programs','workout_sessions','workout_logs','nutrition_plans',
    'daily_nutrition_logs','smoothing_events'
  )
order by c.relname;

-- 2. All 40 expected policies exist (4 per table × 10 tables) --------------
--    Expected: 40 rows, every `exists` = true.

with expected(table_name, policy_name) as (
  values
    ('profiles','profiles_select_self'),
    ('profiles','profiles_insert_self'),
    ('profiles','profiles_update_self'),
    ('profiles','profiles_delete_self'),
    ('goals','goals_select_self'),
    ('goals','goals_insert_self'),
    ('goals','goals_update_self'),
    ('goals','goals_delete_self'),
    ('training_preferences','training_preferences_select_self'),
    ('training_preferences','training_preferences_insert_self'),
    ('training_preferences','training_preferences_update_self'),
    ('training_preferences','training_preferences_delete_self'),
    ('diet_preferences','diet_preferences_select_self'),
    ('diet_preferences','diet_preferences_insert_self'),
    ('diet_preferences','diet_preferences_update_self'),
    ('diet_preferences','diet_preferences_delete_self'),
    ('programs','programs_select_self'),
    ('programs','programs_insert_self'),
    ('programs','programs_update_self'),
    ('programs','programs_delete_self'),
    ('workout_sessions','workout_sessions_select_self'),
    ('workout_sessions','workout_sessions_insert_self'),
    ('workout_sessions','workout_sessions_update_self'),
    ('workout_sessions','workout_sessions_delete_self'),
    ('workout_logs','workout_logs_select_self'),
    ('workout_logs','workout_logs_insert_self'),
    ('workout_logs','workout_logs_update_self'),
    ('workout_logs','workout_logs_delete_self'),
    ('nutrition_plans','nutrition_plans_select_self'),
    ('nutrition_plans','nutrition_plans_insert_self'),
    ('nutrition_plans','nutrition_plans_update_self'),
    ('nutrition_plans','nutrition_plans_delete_self'),
    ('daily_nutrition_logs','daily_nutrition_logs_select_self'),
    ('daily_nutrition_logs','daily_nutrition_logs_insert_self'),
    ('daily_nutrition_logs','daily_nutrition_logs_update_self'),
    ('daily_nutrition_logs','daily_nutrition_logs_delete_self'),
    ('smoothing_events','smoothing_events_select_self'),
    ('smoothing_events','smoothing_events_insert_self'),
    ('smoothing_events','smoothing_events_update_self'),
    ('smoothing_events','smoothing_events_delete_self')
)
select e.table_name,
       e.policy_name,
       (p.policyname is not null) as exists
from expected e
left join pg_policies p
  on  p.schemaname = 'public'
  and p.tablename  = e.table_name
  and p.policyname = e.policy_name
order by e.table_name, e.policy_name;

-- 3. `authenticated` has EXACTLY SELECT/INSERT/UPDATE/DELETE on every ------
--    Klean AI table — and nothing else (no REFERENCES / TRIGGER / TRUNCATE).
--
--    Expected:
--      - `crud_count`        = 4 for every table (S/I/U/D).
--      - `extra_privileges`  = 0 for every table.
--    Any other shape is a misconfiguration and must be fixed.

with grants as (
  select table_name, privilege_type
  from information_schema.role_table_grants
  where grantee = 'authenticated'
    and table_schema = 'public'
    and table_name in (
      'profiles','goals','training_preferences','diet_preferences',
      'programs','workout_sessions','workout_logs','nutrition_plans',
      'daily_nutrition_logs','smoothing_events'
    )
)
select table_name,
       count(*) filter (
         where privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
       ) as crud_count,
       count(*) filter (
         where privilege_type not in ('SELECT','INSERT','UPDATE','DELETE')
       ) as extra_privileges
from grants
group by table_name
order by table_name;

-- 3b. (Diagnostic) which non-CRUD privileges does `authenticated` still ---
--     hold, if any?
--     Expected: 0 rows. If anything appears, the printed `privilege_type`
--     column tells you exactly what to revoke (typically REFERENCES /
--     TRIGGER / TRUNCATE inherited from older Supabase defaults). Running
--     `0003_grants.sql` again clears them.

select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in (
    'profiles','goals','training_preferences','diet_preferences',
    'programs','workout_sessions','workout_logs','nutrition_plans',
    'daily_nutrition_logs','smoothing_events'
  )
  and privilege_type not in ('SELECT','INSERT','UPDATE','DELETE')
order by table_name, privilege_type;

-- 4. `anon` has ZERO direct privileges on private tables -------------------
--    Expected: 0 rows. If anything appears, revoke it — unauthenticated
--    users must not have any direct privileges.
--    NB: this only checks DIRECT grants to anon. Inherited privileges
--    from PUBLIC are checked separately in section 5.

select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
  and table_name in (
    'profiles','goals','training_preferences','diet_preferences',
    'programs','workout_sessions','workout_logs','nutrition_plans',
    'daily_nutrition_logs','smoothing_events'
  )
order by table_name, privilege_type;

-- 5. `PUBLIC` has ZERO privileges on private tables ------------------------
--
--    PostgreSQL inherits PUBLIC privileges to every role automatically,
--    including `anon`. Any GRANT to PUBLIC silently leaks to anon, even
--    if anon was directly revoked. This is the most common cause of
--    residual REFERENCES / TRIGGER / TRUNCATE on `anon` after a tightening
--    pass.
--
--    Expected: 0 rows.

select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'PUBLIC'
  and table_schema = 'public'
  and table_name in (
    'profiles','goals','training_preferences','diet_preferences',
    'programs','workout_sessions','workout_logs','nutrition_plans',
    'daily_nutrition_logs','smoothing_events'
  )
order by table_name, privilege_type;
