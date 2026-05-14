import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../src/features/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

const mockQueueNutritionSync = jest.fn();
jest.mock('../../src/features/nutrition/services/nutrition-sync', () => ({
  queueNutritionSync: (...args: unknown[]) => mockQueueNutritionSync(...args),
}));

// eslint-disable-next-line import/first
import { useNutritionLogger } from '../../src/features/nutrition/hooks/useNutritionLogger';
// eslint-disable-next-line import/first
import { getDay } from '../../src/features/nutrition/store/nutrition-storage';

const TODAY = '2026-05-07';

describe('useNutritionLogger', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockQueueNutritionSync.mockReset();
    // Default: never resolve. Tests that care about post-sync transitions
    // override this in their own block to avoid race-y assertions on the
    // optimistic 'pending' state.
    mockQueueNutritionSync.mockReturnValue(new Promise<never>(() => {}));
  });

  it('starts with zeros and local syncStatus', async () => {
    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.record.calories).toBe(0);
    expect(result.current.syncStatus).toBe('local');
    expect(result.current.lastSyncError).toBeNull();
  });

  it('addEntry updates totals optimistically and flips syncStatus to pending', async () => {
    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addEntry({ calories: 500, proteinG: 30, carbsG: 60, fatG: 18 });
    });

    expect(result.current.record.calories).toBe(500);
    expect(result.current.record.proteinG).toBe(30);
    expect(result.current.syncStatus).toBe('pending');
  });

  it('persists each entry to AsyncStorage', async () => {
    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 250 }));

    await waitFor(async () => {
      const saved = await getDay(TODAY);
      expect(saved?.calories).toBe(250);
    });
  });

  it('enqueues a nutrition sync with the cumulative totals', async () => {
    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 100 }));
    act(() => result.current.addEntry({ calories: 300 }));

    await waitFor(() => expect(mockQueueNutritionSync).toHaveBeenCalledTimes(2));
    const lastCall = mockQueueNutritionSync.mock.calls.at(-1)?.[0] as {
      record: { calories: number };
      userId: string;
    };
    expect(lastCall?.userId).toBe('test-user');
    expect(lastCall?.record.calories).toBe(400);
  });

  it('transitions to synced when the queue reports success', async () => {
    mockQueueNutritionSync.mockResolvedValueOnce({ outcome: 'synced' });

    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 100 }));

    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));
    expect(result.current.lastSyncError).toBeNull();
  });

  it('transitions to failed and surfaces the error message from the queue', async () => {
    mockQueueNutritionSync.mockResolvedValueOnce({
      outcome: 'failed',
      error: 'rls denied',
    });

    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 100 }));

    await waitFor(() => expect(result.current.syncStatus).toBe('failed'));
    expect(result.current.lastSyncError).toBe('rls denied');
  });

  it('transitions to failed when the queue throws', async () => {
    mockQueueNutritionSync.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 100 }));

    await waitFor(() => expect(result.current.syncStatus).toBe('failed'));
    expect(result.current.lastSyncError).toBe('network down');
  });

  it('retrySync re-queues the day and reports synced', async () => {
    mockQueueNutritionSync.mockResolvedValueOnce({ outcome: 'failed', error: 'first' });
    mockQueueNutritionSync.mockResolvedValueOnce({ outcome: 'synced' });

    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 100 }));
    await waitFor(() => expect(result.current.syncStatus).toBe('failed'));

    act(() => result.current.retrySync());
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));
    expect(mockQueueNutritionSync).toHaveBeenCalledTimes(2);
  });

  it('retrySync is a noop when the record is already synced', async () => {
    mockQueueNutritionSync.mockResolvedValueOnce({ outcome: 'synced' });

    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 100 }));
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));

    act(() => result.current.retrySync());
    expect(mockQueueNutritionSync).toHaveBeenCalledTimes(1);
  });

  it('reset zeroes the record and persists the empty state', async () => {
    const { result } = renderHook(() => useNutritionLogger(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addEntry({ calories: 500 }));
    act(() => result.current.reset());

    expect(result.current.record.calories).toBe(0);
    await waitFor(async () => {
      const saved = await getDay(TODAY);
      expect(saved?.calories).toBe(0);
    });
  });
});
