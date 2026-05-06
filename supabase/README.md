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
  `profiles` table whose primary key is the user id).

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
