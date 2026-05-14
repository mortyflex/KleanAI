import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetForTests,
  enqueue,
  getAll,
  getCounts,
  updateStatus,
} from '../../src/features/sync/sync-queue-storage';
import {
  __setSyncHandlerForTests,
} from '../../src/features/sync/sync-handlers';
import {
  __resetRunnerForTests,
  DEFAULT_MAX_ATTEMPTS,
  runSync,
} from '../../src/features/sync/sync-runner';

describe('sync-runner', () => {
  const restorers: (() => void)[] = [];

  beforeEach(async () => {
    await __resetForTests();
    await AsyncStorage.clear();
    __resetRunnerForTests();
  });

  afterEach(() => {
    while (restorers.length) restorers.pop()?.();
  });

  function mockHandler(
    kind: Parameters<typeof __setSyncHandlerForTests>[0],
    impl: jest.Mock,
  ) {
    restorers.push(__setSyncHandlerForTests(kind, impl));
    return impl;
  }

  it('marks a successful item as synced and increments attempts', async () => {
    const handler = mockHandler('workout_session', jest.fn().mockResolvedValue(undefined));
    await enqueue({
      resource: 'workout_session',
      dedupeKey: 'workout_session:s-1',
      payload: { user_id: 'u', session_id: 's-1' },
    });

    const report = await runSync();

    expect(report).toEqual({ attempted: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(handler).toHaveBeenCalledTimes(1);
    const items = await getAll();
    expect(items[0]!.status).toBe('synced');
    expect(items[0]!.attempts).toBe(1);
  });

  it('marks a failing item as failed with lastError + incremented attempts', async () => {
    mockHandler('nutrition_log', jest.fn().mockRejectedValue(new Error('500 from supabase')));
    await enqueue({
      resource: 'nutrition_log',
      dedupeKey: 'nutrition_log:2026-05-07',
      payload: {},
    });

    const report = await runSync();

    expect(report).toEqual({ attempted: 1, succeeded: 0, failed: 1, skipped: 0 });
    const [item] = await getAll();
    expect(item!.status).toBe('failed');
    expect(item!.attempts).toBe(1);
    expect(item!.lastError).toBe('500 from supabase');
  });

  it('retries a failed item on the next run (does not skip until cap)', async () => {
    const handler = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce(undefined);
    mockHandler('smoothing_event', handler);
    await enqueue({
      resource: 'smoothing_event',
      dedupeKey: 'smoothing_event:e1',
      payload: {},
    });

    const first = await runSync();
    expect(first.failed).toBe(1);

    const second = await runSync();
    expect(second.succeeded).toBe(1);
    expect(handler).toHaveBeenCalledTimes(2);
    const counts = await getCounts();
    expect(counts.synced).toBe(1);
  });

  it('skips items that have hit the attempts cap', async () => {
    const handler = mockHandler('workout_log', jest.fn().mockRejectedValue(new Error('nope')));
    const item = await enqueue({
      resource: 'workout_log',
      dedupeKey: 'workout_log:s-1:row',
      payload: {},
    });
    // Pretend we've already burned the budget
    await updateStatus(item.id, 'failed', { incrementAttempts: false });
    const items = await getAll();
    items[0]!.attempts = DEFAULT_MAX_ATTEMPTS;
    // Re-write directly
    await AsyncStorage.setItem('@klean_sync_queue_v1', JSON.stringify(items));

    const report = await runSync();
    expect(report.skipped).toBe(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('processes mixed items in one drain (success + failure)', async () => {
    mockHandler('workout_session', jest.fn().mockResolvedValue(undefined));
    mockHandler(
      'workout_log',
      jest.fn().mockRejectedValue(new Error('logs are flaky')),
    );
    await enqueue({
      resource: 'workout_session',
      dedupeKey: 'workout_session:s-1',
      payload: {},
    });
    await enqueue({
      resource: 'workout_log',
      dedupeKey: 'workout_log:s-1:row',
      payload: {},
    });

    const report = await runSync();
    expect(report.succeeded).toBe(1);
    expect(report.failed).toBe(1);
    const counts = await getCounts();
    expect(counts.synced).toBe(1);
    expect(counts.failed).toBe(1);
  });

  it('serialises concurrent runSync calls (returns the same in-flight promise)', async () => {
    const handler = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    mockHandler('workout_session', handler);
    await enqueue({
      resource: 'workout_session',
      dedupeKey: 'workout_session:s-1',
      payload: {},
    });

    const a = runSync();
    const b = runSync();
    expect(a).toBe(b);
    await a;
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
