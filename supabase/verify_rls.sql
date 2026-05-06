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

-- 6. Single-result summary -------------------------------------------------
--
--    Supabase's SQL editor only displays one result set per run, so when
--    you click "Run" on this whole file you only see the final query's
--    output. This summary aggregates checks 1–5 into a single result
--    table you can read at a glance: every `status` should be `OK`.
--    If any row says `FAIL`, scroll up and run the matching section on
--    its own to inspect the offending rows.

with klean_tables(name) as (
  values
    ('profiles'),('goals'),('training_preferences'),('diet_preferences'),
    ('programs'),('workout_sessions'),('workout_logs'),('nutrition_plans'),
    ('daily_nutrition_logs'),('smoothing_events')
),
check_rls as (
  select
    count(*) filter (where c.relrowsecurity)     as rls_on,
    count(*)                                     as total_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname in (select name from klean_tables)
),
check_policies as (
  select count(*) as policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (select name from klean_tables)
),
check_authenticated as (
  select
    count(*) filter (where privilege_type in ('SELECT','INSERT','UPDATE','DELETE')) as crud,
    count(*) filter (where privilege_type not in ('SELECT','INSERT','UPDATE','DELETE')) as extras
  from information_schema.role_table_grants
  where grantee = 'authenticated'
    and table_schema = 'public'
    and table_name in (select name from klean_tables)
),
check_anon as (
  select count(*) as priv_count
  from information_schema.role_table_grants
  where grantee = 'anon'
    and table_schema = 'public'
    and table_name in (select name from klean_tables)
),
check_public as (
  select count(*) as priv_count
  from information_schema.role_table_grants
  where grantee = 'PUBLIC'
    and table_schema = 'public'
    and table_name in (select name from klean_tables)
)
select 1 as section, 'RLS enabled on all 10 tables' as check_name,
       case when r.rls_on = 10 and r.total_tables = 10 then 'OK' else 'FAIL' end as status,
       r.rls_on || ' / ' || r.total_tables || ' tables with RLS' as detail
from check_rls r
union all
select 2, '40 RLS policies present',
       case when p.policy_count = 40 then 'OK' else 'FAIL' end,
       p.policy_count || ' / 40 policies'
from check_policies p
union all
select 3, 'authenticated holds exactly CRUD (no extras)',
       case when a.crud = 40 and a.extras = 0 then 'OK' else 'FAIL' end,
       a.crud || ' CRUD, ' || a.extras || ' extras (expected 40 / 0)'
from check_authenticated a
union all
select 4, 'anon holds zero direct privileges',
       case when an.priv_count = 0 then 'OK' else 'FAIL' end,
       an.priv_count || ' direct privileges'
from check_anon an
union all
select 5, 'PUBLIC holds zero privileges',
       case when pu.priv_count = 0 then 'OK' else 'FAIL' end,
       pu.priv_count || ' privileges'
from check_public pu
order by section;
