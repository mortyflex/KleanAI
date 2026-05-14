import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetForTests,
  clearSynced,
  enqueue,
  getAll,
  getCounts,
  getPending,
  remove,
  updateStatus,
} from '../../src/features/sync/sync-queue-storage';

describe('sync-queue-storage', () => {
  beforeEach(async () => {
    await __resetForTests();
    await AsyncStorage.clear();
  });

  describe('enqueue', () => {
    it('returns a fresh pending item with attempts = 0', async () => {
      const item = await enqueue({
        resource: 'workout_session',
        dedupeKey: 'workout_session:s-1',
        payload: { foo: 'bar' },
      });
      expect(item.status).toBe('pending');
      expect(item.attempts).toBe(0);
      expect(item.id).toBeTruthy();
    });

    it('persists the item across reads', async () => {
      await enqueue({
        resource: 'nutrition_log',
        dedupeKey: 'nutrition_log:2026-05-07',
        payload: { calories: 2000 },
      });
      const all = await getAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.resource).toBe('nutrition_log');
    });

    it('replaces an existing pending item that shares the same dedupe key', async () => {
      const first = await enqueue({
        resource: 'workout_session',
        dedupeKey: 'workout_session:s-1',
        payload: { calories: 100 },
      });
      const second = await enqueue({
        resource: 'workout_session',
        dedupeKey: 'workout_session:s-1',
        payload: { calories: 200 },
      });
      const all = await getAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.id).toBe(second.id);
      expect(all[0]!.id).not.toBe(first.id);
      expect(all[0]!.payload).toEqual({ calories: 200 });
    });

    it('replaces a failed item with the same dedupe key (so retry uses fresh payload)', async () => {
      const first = await enqueue({
        resource: 'workout_log',
        dedupeKey: 'workout_log:s-1:bench_press',
        payload: { reps: 5 },
      });
      await updateStatus(first.id, 'failed', {
        incrementAttempts: true,
        lastError: 'oops',
      });
      const second = await enqueue({
        resource: 'workout_log',
        dedupeKey: 'workout_log:s-1:bench_press',
        payload: { reps: 8 },
      });
      const all = await getAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.id).toBe(second.id);
      expect(all[0]!.payload).toEqual({ reps: 8 });
      expect(all[0]!.attempts).toBe(0);
    });

    it('keeps a synced item and adds a fresh pending one (no replacement)', async () => {
      const first = await enqueue({
        resource: 'workout_session',
        dedupeKey: 'workout_session:s-1',
        payload: { v: 1 },
      });
      await updateStatus(first.id, 'synced');
      await enqueue({
        resource: 'workout_session',
        dedupeKey: 'workout_session:s-1',
        payload: { v: 2 },
      });
      const all = await getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('getPending', () => {
    it('returns pending and failed items but not synced ones', async () => {
      const a = await enqueue({
        resource: 'nutrition_log',
        dedupeKey: 'nutrition_log:a',
        payload: {},
      });
      const b = await enqueue({
        resource: 'nutrition_log',
        dedupeKey: 'nutrition_log:b',
        payload: {},
      });
      const c = await enqueue({
        resource: 'nutrition_log',
        dedupeKey: 'nutrition_log:c',
        payload: {},
      });
      await updateStatus(b.id, 'failed', { incrementAttempts: true });
      await updateStatus(c.id, 'synced');

      const pending = await getPending();
      const ids = pending.map((p) => p.id).sort();
      expect(ids).toEqual([a.id, b.id].sort());
    });
  });

  describe('updateStatus', () => {
    it('transitions a pending item through syncing → synced', async () => {
      const item = await enqueue({
        resource: 'smoothing_event',
        dedupeKey: 'smoothing_event:e-1',
        payload: {},
      });
      const syncing = await updateStatus(item.id, 'syncing');
      expect(syncing?.status).toBe('syncing');
      const synced = await updateStatus(item.id, 'synced', { incrementAttempts: true });
      expect(synced?.status).toBe('synced');
      expect(synced?.attempts).toBe(1);
    });

    it('records lastError on failed', async () => {
      const item = await enqueue({
        resource: 'workout_log',
        dedupeKey: 'workout_log:s-1:row',
        payload: {},
      });
      const failed = await updateStatus(item.id, 'failed', {
        incrementAttempts: true,
        lastError: 'boom',
      });
      expect(failed?.status).toBe('failed');
      expect(failed?.lastError).toBe('boom');
      expect(failed?.attempts).toBe(1);
    });

    it('returns null for an unknown id', async () => {
      const result = await updateStatus('nope', 'synced');
      expect(result).toBeNull();
    });
  });

  describe('getCounts', () => {
    it('groups items by status', async () => {
      const a = await enqueue({ resource: 'workout_session', dedupeKey: 'a', payload: {} });
      const b = await enqueue({ resource: 'workout_session', dedupeKey: 'b', payload: {} });
      const c = await enqueue({ resource: 'workout_session', dedupeKey: 'c', payload: {} });
      const d = await enqueue({ resource: 'workout_session', dedupeKey: 'd', payload: {} });
      await updateStatus(b.id, 'syncing');
      await updateStatus(c.id, 'synced');
      await updateStatus(d.id, 'failed', { incrementAttempts: true });
      const counts = await getCounts();
      expect(counts).toEqual({ pending: 1, syncing: 1, synced: 1, failed: 1 });
      expect(a.status).toBe('pending');
    });
  });

  describe('remove + clearSynced', () => {
    it('remove deletes a single item', async () => {
      const item = await enqueue({ resource: 'workout_log', dedupeKey: 'k', payload: {} });
      await remove(item.id);
      expect(await getAll()).toHaveLength(0);
    });

    it('clearSynced drops only synced items', async () => {
      const a = await enqueue({ resource: 'workout_log', dedupeKey: 'k1', payload: {} });
      const b = await enqueue({ resource: 'workout_log', dedupeKey: 'k2', payload: {} });
      await updateStatus(a.id, 'synced');
      await clearSynced();
      const all = await getAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.id).toBe(b.id);
    });
  });
});
