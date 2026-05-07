/**
 * Verifies queueSmoothingSync enqueues a smoothing event and reports the
 * runner outcome (synced / failed / pending) to the caller. Supabase is
 * mocked via the sync handler test seam; no real network calls.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetForTests } from '../../src/features/sync/sync-queue-storage';
import {
  __setSyncHandlerForTests,
} from '../../src/features/sync/sync-handlers';
import { __resetRunnerForTests } from '../../src/features/sync/sync-runner';
import { queueSmoothingSync } from '../../src/features/smoothing/services/smoothing-sync';
import type {
  ExcessFoodEvent,
  NutritionSmoothingResult,
} from '../../src/types/smoothing.types';

const event: ExcessFoodEvent = {
  type: 'excess_food',
  excessKcal: 600,
  id: 'evt-123',
};

const result: NutritionSmoothingResult = {
  ok: true,
  category: 'nutrition',
  eventType: 'excess_food',
  adjustments: [
    { dayOffset: 1, kcalDelta: -200, adjustedDailyTarget: 1800 },
    { dayOffset: 2, kcalDelta: -200, adjustedDailyTarget: 1800 },
    { dayOffset: 3, kcalDelta: -200, adjustedDailyTarget: 1800 },
  ],
  spreadDays: 3,
  totalCompensatedKcal: 600,
  totalExcessKcal: 600,
  unaddressedKcal: 0,
  hitFloor: false,
  floor: 1500,
  messageKey: 'smoothing.events.excess_food.message',
  recommendationKey: 'smoothing.events.excess_food.recommendation',
};

describe('queueSmoothingSync', () => {
  const restorers: (() => void)[] = [];

  beforeEach(async () => {
    await __resetForTests();
    await AsyncStorage.clear();
    __resetRunnerForTests();
  });

  afterEach(() => {
    while (restorers.length) restorers.pop()?.();
  });

  it('returns synced when the handler resolves and posts the right payload', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    restorers.push(__setSyncHandlerForTests('smoothing_event', handler));

    const r = await queueSmoothingSync({
      userId: 'u1',
      event,
      result,
      eventId: 'evt-123',
    });

    expect(r.outcome).toBe('synced');
    const payload = handler.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      user_id: 'u1',
      event_type: 'excess_food',
      delta_kcal: -600,
      spread_days: 3,
    });
  });

  it('returns failed and surfaces the error when the handler rejects', async () => {
    restorers.push(
      __setSyncHandlerForTests(
        'smoothing_event',
        jest.fn().mockRejectedValue(new Error('network down')),
      ),
    );

    const r = await queueSmoothingSync({
      userId: 'u1',
      event,
      result,
      eventId: 'evt-123',
    });

    expect(r.outcome).toBe('failed');
    expect(r.error).toBe('network down');
  });
});
