-- Klean AI — Row Level Security policies
--
-- One pattern across all tables: a row is visible / writable only when its
-- `user_id` matches the authenticated `auth.uid()`. The `profiles` table
-- uses `id` instead of `user_id` because `id` IS the auth user id.
--
-- We split into 4 policies per table (select / insert / update / delete)
-- rather than `for all` because:
--   1. inserts need `with check` and not `using`,
--   2. it's clearer in the Supabase dashboard,
--   3. it makes auditing easier.
--
-- These policies are designed for RLS-on, no service-role bypass needed for
-- normal app traffic. Edge Functions that need cross-user access should use
-- the service-role key explicitly (which bypasses RLS).

-- profiles -----------------------------------------------------------------

create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_delete_self" on public.profiles
  for delete using (auth.uid() = id);

-- goals --------------------------------------------------------------------

create policy "goals_select_self" on public.goals
  for select using (auth.uid() = user_id);

create policy "goals_insert_self" on public.goals
  for insert with check (auth.uid() = user_id);

create policy "goals_update_self" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals_delete_self" on public.goals
  for delete using (auth.uid() = user_id);

-- training_preferences -----------------------------------------------------

create policy "training_preferences_select_self" on public.training_preferences
  for select using (auth.uid() = user_id);

create policy "training_preferences_insert_self" on public.training_preferences
  for insert with check (auth.uid() = user_id);

create policy "training_preferences_update_self" on public.training_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "training_preferences_delete_self" on public.training_preferences
  for delete using (auth.uid() = user_id);

-- diet_preferences ---------------------------------------------------------

create policy "diet_preferences_select_self" on public.diet_preferences
  for select using (auth.uid() = user_id);

create policy "diet_preferences_insert_self" on public.diet_preferences
  for insert with check (auth.uid() = user_id);

create policy "diet_preferences_update_self" on public.diet_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "diet_preferences_delete_self" on public.diet_preferences
  for delete using (auth.uid() = user_id);

-- programs -----------------------------------------------------------------

create policy "programs_select_self" on public.programs
  for select using (auth.uid() = user_id);

create policy "programs_insert_self" on public.programs
  for insert with check (auth.uid() = user_id);

create policy "programs_update_self" on public.programs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "programs_delete_self" on public.programs
  for delete using (auth.uid() = user_id);

-- workout_sessions ---------------------------------------------------------

create policy "workout_sessions_select_self" on public.workout_sessions
  for select using (auth.uid() = user_id);

create policy "workout_sessions_insert_self" on public.workout_sessions
  for insert with check (auth.uid() = user_id);

create policy "workout_sessions_update_self" on public.workout_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_sessions_delete_self" on public.workout_sessions
  for delete using (auth.uid() = user_id);

-- workout_logs -------------------------------------------------------------

create policy "workout_logs_select_self" on public.workout_logs
  for select using (auth.uid() = user_id);

create policy "workout_logs_insert_self" on public.workout_logs
  for insert with check (auth.uid() = user_id);

create policy "workout_logs_update_self" on public.workout_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_logs_delete_self" on public.workout_logs
  for delete using (auth.uid() = user_id);

-- nutrition_plans ----------------------------------------------------------

create policy "nutrition_plans_select_self" on public.nutrition_plans
  for select using (auth.uid() = user_id);

create policy "nutrition_plans_insert_self" on public.nutrition_plans
  for insert with check (auth.uid() = user_id);

create policy "nutrition_plans_update_self" on public.nutrition_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "nutrition_plans_delete_self" on public.nutrition_plans
  for delete using (auth.uid() = user_id);

-- daily_nutrition_logs -----------------------------------------------------

create policy "daily_nutrition_logs_select_self" on public.daily_nutrition_logs
  for select using (auth.uid() = user_id);

create policy "daily_nutrition_logs_insert_self" on public.daily_nutrition_logs
  for insert with check (auth.uid() = user_id);

create policy "daily_nutrition_logs_update_self" on public.daily_nutrition_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "daily_nutrition_logs_delete_self" on public.daily_nutrition_logs
  for delete using (auth.uid() = user_id);

-- smoothing_events ---------------------------------------------------------

create policy "smoothing_events_select_self" on public.smoothing_events
  for select using (auth.uid() = user_id);

create policy "smoothing_events_insert_self" on public.smoothing_events
  for insert with check (auth.uid() = user_id);

create policy "smoothing_events_update_self" on public.smoothing_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "smoothing_events_delete_self" on public.smoothing_events
  for delete using (auth.uid() = user_id);
