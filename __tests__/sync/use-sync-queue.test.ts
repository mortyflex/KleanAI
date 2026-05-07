import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  __resetForTests,
  enqueue,
  updateStatus,
} from '../../src/features/sync/sync-queue-storage';
import {
  __setSyncHandlerForTests,
} from '../../src/features/sync/sync-handlers';
import { __resetRunnerForTests } from '../../src/features/sync/sync-runner';
import { useSyncQueue } from '../../src/features/sync/hooks/useSyncQueue';

describe('useSyncQueue', () => {
  const restorers: (() => void)[] = [];

  beforeEach(async () => {
    await __resetForTests();
    await AsyncStorage.clear();
    __resetRunnerForTests();
  });

  afterEach(() => {
    while (restorers.length) restorers.pop()?.();
  });

  it('reports zero counts on an empty queue', async () => {
    const { result } = renderHook(() => useSyncQueue());
    await waitFor(() => {
      expect(result.current.counts).toEqual({
        pending: 0,
        syncing: 0,
        synced: 0,
        failed: 0,
      });
    });
  });

  it('reflects pending and failed items already in storage on mount', async () => {
    const a = await enqueue({
      resource: 'workout_session',
      dedupeKey: 'a',
      payload: {},
    });
    const b = await enqueue({
      resource: 'workout_session',
      dedupeKey: 'b',
      payload: {},
    });
    await updateStatus(b.id, 'failed', { incrementAttempts: true });
    expect(a.status).toBe('pending');

    const { result } = renderHook(() => useSyncQueue());
    await waitFor(() => {
      expect(result.current.counts.pending).toBe(1);
      expect(result.current.counts.failed).toBe(1);
    });
  });

  it('retry drains the queue and refreshes counts', async () => {
    restorers.push(
      __setSyncHandlerForTests(
        'workout_session',
        jest.fn().mockResolvedValue(undefined),
      ),
    );
    await enqueue({
      resource: 'workout_session',
      dedupeKey: 'a',
      payload: {},
    });
    const { result } = renderHook(() => useSyncQueue());
    await waitFor(() => expect(result.current.counts.pending).toBe(1));

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.counts.pending).toBe(0);
    expect(result.current.counts.synced).toBe(1);
    expect(result.current.isSyncing).toBe(false);
  });
});
