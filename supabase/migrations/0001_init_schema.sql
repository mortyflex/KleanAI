-- Klean AI — initial schema (Phase: Supabase foundation)
--
-- This file is a DRAFT. It has not been applied to a real Supabase project
-- yet. Apply via the Supabase CLI once a remote project exists:
--
--   npx supabase link --project-ref <ref>
--   npx supabase db push
--
-- Notes
-- - Every domain table has `user_id uuid NOT NULL REFERENCES auth.users(id)
--   ON DELETE CASCADE` so account deletion cleanly removes user data.
-- - All FKs use `ON DELETE CASCADE` from the user direction. Cross-table
--   refs (e.g. workout_logs → workout_sessions) also cascade so a session
--   delete removes its logs.
-- - RLS policies live in `0002_rls_policies.sql`. RLS is enabled here but
--   no policies are created yet — meaning until 0002 is applied, all access
--   is denied for anon/authenticated users (which is the safe default).

-- Helpers ------------------------------------------------------------------

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- profiles -----------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text,
  age integer check (age is null or (age between 14 and 100)),
  gender text check (gender in ('male', 'female', 'other') or gender is null),
  height_cm numeric(5,2) check (height_cm is null or (height_cm between 100 and 250)),
  weight_kg numeric(5,2) check (weight_kg is null or (weight_kg between 30 and 300)),
  fitness_level text check (fitness_level in ('beginner','intermediate','advanced') or fitness_level is null),
  training_location text check (training_location in ('gym','home','both') or training_location is null),
  gym_chain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- goals --------------------------------------------------------------------

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null check (goal_type in ('lose_weight','gain_muscle','maintain','recomposition')),
  target_weight_kg numeric(5,2) check (target_weight_kg is null or (target_weight_kg between 30 and 300)),
  target_weeks integer check (target_weeks is null or (target_weeks between 1 and 104)),
  target_event_label text,
  target_event_date date,
  weekly_pace_kg numeric(4,2),
  classification text check (classification in ('valid','ambitious','unsafe','inconsistent') or classification is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals(user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

-- training_preferences -----------------------------------------------------

create table if not exists public.training_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  days_per_week integer check (days_per_week is null or (days_per_week between 1 and 7)),
  session_duration_min integer check (session_duration_min is null or (session_duration_min between 15 and 180)),
  availability jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists training_preferences_user_id_uniq
  on public.training_preferences(user_id);

create trigger training_preferences_set_updated_at
  before update on public.training_preferences
  for each row execute function public.set_updated_at();

alter table public.training_preferences enable row level security;

-- diet_preferences ---------------------------------------------------------

create table if not exists public.diet_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restrictions text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists diet_preferences_user_id_uniq
  on public.diet_preferences(user_id);

create trigger diet_preferences_set_updated_at
  before update on public.diet_preferences
  for each row execute function public.set_updated_at();

alter table public.diet_preferences enable row level security;

-- programs -----------------------------------------------------------------

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text,
  starts_on date,
  ends_on date,
  status text not null default 'draft' check (status in ('draft','active','completed','cancelled')),
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists programs_user_id_idx on public.programs(user_id);

create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

alter table public.programs enable row level security;

-- workout_sessions ---------------------------------------------------------

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  scheduled_at timestamptz,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','missed','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_id_idx on public.workout_sessions(user_id);
create index if not exists workout_sessions_program_id_idx on public.workout_sessions(program_id);

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;

-- workout_logs -------------------------------------------------------------

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_key text not null,
  set_index integer not null check (set_index >= 0),
  reps integer check (reps is null or reps >= 0),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  rpe numeric(3,1) check (rpe is null or (rpe between 1 and 10)),
  notes text,
  logged_at timestamptz not null default now()
);

create index if not exists workout_logs_user_id_idx on public.workout_logs(user_id);
create index if not exists workout_logs_session_id_idx on public.workout_logs(session_id);

alter table public.workout_logs enable row level security;

-- nutrition_plans ----------------------------------------------------------

create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories_target integer check (calories_target is null or calories_target >= 1000),
  protein_g integer check (protein_g is null or protein_g >= 0),
  carbs_g integer check (carbs_g is null or carbs_g >= 0),
  fat_g integer check (fat_g is null or fat_g >= 0),
  status text not null default 'draft' check (status in ('draft','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_plans_user_id_idx on public.nutrition_plans(user_id);

create trigger nutrition_plans_set_updated_at
  before update on public.nutrition_plans
  for each row execute function public.set_updated_at();

alter table public.nutrition_plans enable row level security;

-- daily_nutrition_logs -----------------------------------------------------

create table if not exists public.daily_nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  calories integer check (calories is null or calories >= 0),
  protein_g integer check (protein_g is null or protein_g >= 0),
  carbs_g integer check (carbs_g is null or carbs_g >= 0),
  fat_g integer check (fat_g is null or fat_g >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists daily_nutrition_logs_user_id_idx on public.daily_nutrition_logs(user_id);

create trigger daily_nutrition_logs_set_updated_at
  before update on public.daily_nutrition_logs
  for each row execute function public.set_updated_at();

alter table public.daily_nutrition_logs enable row level security;

-- smoothing_events ---------------------------------------------------------

create table if not exists public.smoothing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'missed_workout','partial_workout','excess_food','skipped_meal',
    'ordered_food','alcohol','no_machine','no_time'
  )),
  delta_kcal integer,
  spread_days integer check (spread_days is null or (spread_days between 1 and 7)),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists smoothing_events_user_id_idx on public.smoothing_events(user_id);

alter table public.smoothing_events enable row level security;
