import { renderHook, act, waitFor } from '@testing-library/react-native';
import type { SmoothingContext } from '../../src/types/smoothing.types';

jest.mock('../../src/features/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

const mockLogEvent = jest.fn();
jest.mock('../../src/features/smoothing', () => ({
  useSmoothingLogger: () => ({
    logEvent: mockLogEvent,
    status: 'idle',
    lastEventId: null,
    lastSyncError: null,
  }),
}));

// eslint-disable-next-line import/first
import { useNutritionEventReporter } from '../../src/features/nutrition/hooks/useNutritionEventReporter';
// eslint-disable-next-line import/first
import { isAcknowledgedResult } from '../../src/features/nutrition/utils/nutrition-events';

const FEMALE_CTX: SmoothingContext = { gender: 'female', dailyKcalTarget: 1800 };

describe('useNutritionEventReporter', () => {
  beforeEach(() => {
    mockLogEvent.mockReset();
    mockLogEvent.mockResolvedValue('event-id');
  });

  it('acknowledges followed_plan WITHOUT calling the smoothing logger', async () => {
    const { result } = renderHook(() => useNutritionEventReporter(FEMALE_CTX));

    await act(async () => {
      await result.current.report({ type: 'followed_plan' });
    });

    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(result.current.lastResult).not.toBeNull();
    expect(isAcknowledgedResult(result.current.lastResult!)).toBe(true);
  });

  it('reports excess_food via the smoothing logger and updates lastResult', async () => {
    const { result } = renderHook(() => useNutritionEventReporter(FEMALE_CTX));

    await act(async () => {
      await result.current.report({ type: 'excess_food', kcal: 500 });
    });

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    const [event, smoothingResult] = mockLogEvent.mock.calls[0];
    expect(event.type).toBe('excess_food');
    expect(event.excessKcal).toBe(500);
    expect(smoothingResult.category).toBe('nutrition');
    expect(result.current.lastResult).not.toBeNull();
  });

  it('reports skipped_meal via the smoothing logger with no compensation', async () => {
    const { result } = renderHook(() => useNutritionEventReporter(FEMALE_CTX));

    await act(async () => {
      await result.current.report({ type: 'skipped_meal' });
    });

    expect(mockLogEvent).toHaveBeenCalled();
    const lr = result.current.lastResult;
    if (!lr || !lr.ok || isAcknowledgedResult(lr) || lr.category !== 'nutrition') {
      throw new Error('expected nutrition smoothing result');
    }
    expect(lr.adjustments).toEqual([]);
  });

  it('resolves the report promise even when the logger rejects', async () => {
    mockLogEvent.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useNutritionEventReporter(FEMALE_CTX));

    let thrown: unknown = null;
    await act(async () => {
      try {
        await result.current.report({ type: 'alcohol' });
      } catch (e) {
        thrown = e;
      }
    });

    // The hook surfaces sync failure separately; the report() call itself
    // should propagate the rejection so callers can handle it. Local result
    // is still populated.
    expect(thrown).toBeInstanceOf(Error);
    await waitFor(() => expect(result.current.lastResult).not.toBeNull());
  });
});
