import { renderHook, act, waitFor } from '@testing-library/react-native';
import type {
  ExcessFoodEvent,
  NutritionSmoothingResult,
} from '../../src/types/smoothing.types';

jest.mock('../../src/features/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

const mockQueueSmoothingSync = jest.fn();
jest.mock('../../src/features/smoothing/services/smoothing-sync', () => ({
  queueSmoothingSync: (...args: unknown[]) => mockQueueSmoothingSync(...args),
}));

// eslint-disable-next-line import/first
import { useSmoothingLogger } from '../../src/features/smoothing/hooks/useSmoothingLogger';

const event: ExcessFoodEvent = { type: 'excess_food', excessKcal: 600 };
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

describe('useSmoothingLogger', () => {
  beforeEach(() => {
    mockQueueSmoothingSync.mockReset();
    mockQueueSmoothingSync.mockResolvedValue({ outcome: 'synced' });
  });

  it('starts in idle state with no last id', async () => {
    const { result: hook } = renderHook(() => useSmoothingLogger());
    expect(hook.current.status).toBe('idle');
    expect(hook.current.lastEventId).toBeNull();
    expect(hook.current.lastSyncError).toBeNull();
  });

  it('logEvent flips to synced when the queue reports success', async () => {
    const { result: hook } = renderHook(() => useSmoothingLogger());

    let returnedId: string | null = null;
    await act(async () => {
      returnedId = await hook.current.logEvent(event, result);
    });

    expect(returnedId).toBeTruthy();
    expect(hook.current.status).toBe('synced');
    expect(hook.current.lastEventId).toBe(returnedId);
    expect(mockQueueSmoothingSync).toHaveBeenCalledTimes(1);
    const call = mockQueueSmoothingSync.mock.calls[0]?.[0] as {
      userId: string;
      eventId: string;
      event: { id: string };
    };
    expect(call.userId).toBe('test-user');
    expect(call.eventId).toBeTruthy();
    expect(call.event.id).toBe(call.eventId);
  });

  it('reuses an explicit event.id as the dedupe id', async () => {
    const { result: hook } = renderHook(() => useSmoothingLogger());
    const fixed: ExcessFoodEvent = { ...event, id: 'fixed-event-id' };

    await act(async () => {
      await hook.current.logEvent(fixed, result);
    });

    const call = mockQueueSmoothingSync.mock.calls[0]?.[0] as {
      eventId: string;
    };
    expect(call.eventId).toBe('fixed-event-id');
  });

  it('flips to failed and surfaces the error when the queue reports failure', async () => {
    mockQueueSmoothingSync.mockResolvedValueOnce({
      outcome: 'failed',
      error: 'rls denied',
    });
    const { result: hook } = renderHook(() => useSmoothingLogger());

    await act(async () => {
      await hook.current.logEvent(event, result);
    });

    await waitFor(() => expect(hook.current.status).toBe('failed'));
    expect(hook.current.lastSyncError).toBe('rls denied');
  });

  it('flips to failed when the queue throws', async () => {
    mockQueueSmoothingSync.mockRejectedValueOnce(new Error('storage broken'));
    const { result: hook } = renderHook(() => useSmoothingLogger());

    await act(async () => {
      await hook.current.logEvent(event, result);
    });

    await waitFor(() => expect(hook.current.status).toBe('failed'));
    expect(hook.current.lastSyncError).toBe('storage broken');
  });
});
