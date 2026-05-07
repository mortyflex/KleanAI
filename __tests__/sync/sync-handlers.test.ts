/**
 * Verifies the Supabase-bound handlers in `sync-handlers.ts` invoke the
 * client with the right table + payload shape. The Supabase client is fully
 * mocked — no network calls.
 */

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockInsert = jest.fn().mockResolvedValue({ error: null });

const mockFromBuilder = {
  upsert: mockUpsert,
  insert: mockInsert,
};

const mockFakeClient = {
  from: jest.fn(() => mockFromBuilder),
};

jest.mock('../../src/lib/supabase', () => ({
  getSupabase: () => mockFakeClient,
}));

// eslint-disable-next-line import/first
import { getSyncHandler } from '../../src/features/sync/sync-handlers';

describe('sync-handlers', () => {
  beforeEach(() => {
    mockUpsert.mockClear();
    mockInsert.mockClear();
    mockFakeClient.from.mockClear();
    mockUpsert.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('workout_session: upserts on workout_sessions with the right shape', async () => {
    const handler = getSyncHandler('workout_session');
    await handler({
      user_id: 'u1',
      session_id: 's1',
      day_id: 'day-0',
      status: 'completed',
      finished_at: '2026-05-07T08:00:00Z',
    } as never);

    expect(mockFakeClient.from).toHaveBeenCalledWith('workout_sessions');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 's1',
        user_id: 'u1',
        status: 'completed',
      }),
      expect.objectContaining({ onConflict: 'id' }),
    );
  });

  it('workout_log: inserts a row on workout_logs', async () => {
    const handler = getSyncHandler('workout_log');
    await handler({
      user_id: 'u1',
      session_id: 's1',
      exercise_key: 'bench_press',
      set_index: 1,
      reps: 8,
      logged_at: '2026-05-07T08:01:00Z',
    } as never);

    expect(mockFakeClient.from).toHaveBeenCalledWith('workout_logs');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        session_id: 's1',
        exercise_key: 'bench_press',
        set_index: 1,
        reps: 8,
      }),
    );
  });

  it('nutrition_log: upserts on (user_id, log_date)', async () => {
    const handler = getSyncHandler('nutrition_log');
    await handler({
      user_id: 'u1',
      log_date: '2026-05-07',
      calories: 2000,
      protein_g: 130,
      carbs_g: 210,
      fat_g: 60,
    } as never);

    expect(mockFakeClient.from).toHaveBeenCalledWith('daily_nutrition_logs');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        log_date: '2026-05-07',
        calories: 2000,
      }),
      expect.objectContaining({ onConflict: 'user_id,log_date' }),
    );
  });

  it('smoothing_event: inserts on smoothing_events', async () => {
    const handler = getSyncHandler('smoothing_event');
    await handler({
      user_id: 'u1',
      event_type: 'excess_food',
      delta_kcal: -200,
      spread_days: 3,
      payload: { event: { type: 'excess_food', excessKcal: 600 } },
    } as never);

    expect(mockFakeClient.from).toHaveBeenCalledWith('smoothing_events');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_type: 'excess_food',
        delta_kcal: -200,
        spread_days: 3,
      }),
    );
  });

  it('rejects when Supabase returns an error', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'rls denied' } });
    const handler = getSyncHandler('workout_session');
    await expect(
      handler({
        user_id: 'u1',
        session_id: 's1',
        day_id: 'day-0',
        status: 'completed',
      } as never),
    ).rejects.toThrow(/rls denied/);
  });

  it('throws on an unknown resource kind', () => {
    expect(() => getSyncHandler('nope' as never)).toThrow(/No sync handler/);
  });
});
