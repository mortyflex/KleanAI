# Supabase — Klean AI

This directory holds the database schema drafts and (later) Edge Functions
for the Klean AI Supabase project. **Nothing here has been applied to a real
project yet.**

## Required environment variables

The Expo client only needs the two public values:

| Variable                          | Where it comes from                                        |
| --------------------------------- | ---------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`        | Supabase dashboard → Settings → API → Project URL          |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`   | Supabase dashboard → Settings → API → `anon` `public` key  |

The `service_role` key must never be added to the Expo client — it bypasses
RLS. It is only used inside Edge Functions (where it is injected as a server
secret) or local CLI tooling.

Copy `.env.example` to `.env` at the repo root and fill in the two values.
`.env` is git-ignored.

## Migrations

`migrations/0001_init_schema.sql`
: Creates every domain table (profiles, goals, training_preferences,
  diet_preferences, programs, workout_sessions, workout_logs,
  nutrition_plans, daily_nutrition_logs, smoothing_events), enables RLS, and
  installs an `updated_at` trigger.

`migrations/0002_rls_policies.sql`
: Adds per-user RLS policies. The pattern across every table: a row is
  readable / writable only when `auth.uid() = user_id` (or `= id` for the
  `profiles` table whose primary key is the user id). Idempotent — every
  `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS`, so the file is
  safe to re-apply after a partial first run.

`migrations/0003_grants.sql`
: (a) Revokes ALL privileges on every Klean AI table from `PUBLIC` and
  from `anon`. (b) Grants only `select / insert / update / delete` on
  those tables to the `authenticated` role. (c) Grants `usage` on the
  `public` schema to both `anon` and `authenticated` (PostgREST needs it
  to introspect; USAGE alone exposes no data). Required because the
  project has "Automatically expose new tables" disabled, so PostgREST
  would otherwise return `permission denied` before RLS is even
  evaluated. `anon` is intentionally never granted anything table-level —
  every table holds private user data.

`verify_rls.sql` (not a migration)
: Diagnostic script. Run it from the SQL editor any time you want to
  confirm RLS is on, all 40 policies exist, `authenticated` has exactly
  CRUD on every table (no REFERENCES / TRIGGER / TRUNCATE), and neither
  `anon` nor `PUBLIC` holds any privilege on the private tables.

### Why we revoke from `PUBLIC` and not just from `anon`

PostgreSQL has a pseudo-role called `PUBLIC` that represents every role
in the cluster. Any privilege held by `PUBLIC` is automatically inherited
by `anon`, `authenticated`, and every other role — there is no way to
opt a single role out of that inheritance.

Concretely: revoking `REFERENCES / TRIGGER / TRUNCATE` from `anon` alone
does nothing if those privileges are still sitting on `PUBLIC`, because
`anon` keeps inheriting them. The fix is to revoke from `PUBLIC` first,
then revoke from `anon` as belt-and-braces. `0003_grants.sql` does both,
in that order, before granting anything to `authenticated`.

This is the most common cause of `anon` retaining stray privileges after
a security-tightening pass on a Supabase project, and `verify_rls.sql`
explicitly checks for it (sections 4 and 5).

### Why we also revoke from `authenticated` before granting

Supabase historically ran `GRANT ALL ON TABLES TO authenticated` by
default at table creation, which granted not just SELECT / INSERT /
UPDATE / DELETE but also `REFERENCES`, `TRIGGER`, and `TRUNCATE`.

Disabling "Automatically expose new tables" prevents *new* such grants
but does **not** revoke ones already in place — so even after granting
the minimal CRUD set, `authenticated` may still hold those three extras.
End users must never have them: TRUNCATE in particular bypasses RLS
(it operates at the table level, not row level).

`0003_grants.sql` therefore does `REVOKE ALL FROM authenticated` first,
then `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated`. Section 3
of `verify_rls.sql` checks the count, and section 3b lists any stray
non-CRUD privilege so you can see exactly what's left.

## Applying migrations (later)

When a real Supabase project is ready:

```bash
# 1. Install the CLI globally (one-time)
brew install supabase/tap/supabase

# 2. From the repo root
supabase login
supabase link --project-ref <your-project-ref>

# 3. Push the SQL files
supabase db push
```

Or paste the files into the SQL editor in the Supabase dashboard for a
quick test.

## Testing auth and RLS later

Once the schema is live and `.env` is filled:

1. **Auth (manual smoke test).**
   - Run the app, open `/(auth)/register`, create an account.
   - Check the user appears in Supabase → Authentication → Users.
   - Sign out, sign in again on `/(auth)/login`.

2. **RLS (with the SQL editor).**
   - Open Supabase → SQL Editor → "Run as `authenticated`" with two
     different user JWTs.
   - Insert a `goals` row as user A. As user B, run
     `select * from goals;` — you must see *zero* rows.
   - Repeat for every table to confirm cross-user isolation.

3. **Optional: Postgres-level test.**
   - In the SQL editor: `set role authenticated; set local
     "request.jwt.claim.sub" = '<user-a-uuid>';` then run insert/select.
   - Switch the claim to user B and confirm no leakage.

## What's still mocked / out of scope

- Profile sync between the local onboarding state and `profiles` table.
- Workout / nutrition / smoothing data still lives in AsyncStorage on the
  device — Supabase wiring of these features is a future phase.
- Edge Functions (`generate-program`, `smooth-metabolism`, etc.) are not
  scaffolded yet.
- AI Vision (Gemini) and RevenueCat integration — explicitly out of scope
  for this phase.
