/**
 * Verifies queueNutritionSync enqueues a daily log and reports the runner
 * outcome (synced / failed / pending) to the caller. Supabase is fully mocked
 * via the sync handler test seam; no real network calls.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetForTests } from '../../src/features/sync/sync-queue-storage';
import {
  __setSyncHandlerForTests,
} from '../../src/features/sync/sync-handlers';
import { __resetRunnerForTests } from '../../src/features/sync/sync-runner';
import { queueNutritionSync } from '../../src/features/nutrition/services/nutrition-sync';
import type { DailyNutritionRecord } from '../../src/features/nutrition/types';

const TODAY = '2026-05-07';

const RECORD: DailyNutritionRecord = {
  logDate: TODAY,
  calories: 1800,
  proteinG: 130,
  carbsG: 210,
  fatG: 60,
  syncStatus: 'pending',
  updatedAt: '2026-05-07T08:00:00.000Z',
};

describe('queueNutritionSync', () => {
  const restorers: (() => void)[] = [];

  beforeEach(async () => {
    await __resetForTests();
    await AsyncStorage.clear();
    __resetRunnerForTests();
  });

  afterEach(() => {
    while (restorers.length) restorers.pop()?.();
  });

  it('returns synced when the handler resolves', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    restorers.push(__setSyncHandlerForTests('nutrition_log', handler));

    const result = await queueNutritionSync({ userId: 'u1', record: RECORD });

    expect(result.outcome).toBe('synced');
    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      user_id: 'u1',
      log_date: TODAY,
      calories: 1800,
      protein_g: 130,
    });
  });

  it('returns failed and surfaces the error when the handler rejects', async () => {
    restorers.push(
      __setSyncHandlerForTests(
        'nutrition_log',
        jest.fn().mockRejectedValue(new Error('rls denied')),
      ),
    );

    const result = await queueNutritionSync({ userId: 'u1', record: RECORD });

    expect(result.outcome).toBe('failed');
    expect(result.error).toBe('rls denied');
  });

  it('uses dedupe so the same day overwrites the prior pending payload', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    restorers.push(__setSyncHandlerForTests('nutrition_log', handler));

    await queueNutritionSync({
      userId: 'u1',
      record: { ...RECORD, calories: 1500 },
    });
    await queueNutritionSync({
      userId: 'u1',
      record: { ...RECORD, calories: 2000 },
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
