import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth';
import { queueNutritionSync } from '../services/nutrition-sync';
import { getDay, saveDay } from '../store/nutrition-storage';
import type { DailyNutritionRecord, NutritionSyncStatus } from '../types';

const EMPTY = (logDate: string): DailyNutritionRecord => ({
  logDate,
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  syncStatus: 'local',
  updatedAt: new Date().toISOString(),
});

export interface NutritionDelta {
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  notes?: string;
}

export interface UseNutritionLoggerResult {
  record: DailyNutritionRecord;
  syncStatus: NutritionSyncStatus;
  lastSyncError: string | null;
  isLoading: boolean;
  addEntry: (delta: NutritionDelta) => void;
  retrySync: () => void;
  reset: () => void;
}

/**
 * Track today's nutrition totals offline-first. Each `addEntry` updates the
 * local record optimistically, persists to AsyncStorage, then enqueues a
 * Supabase upsert. The runner returns an outcome which we use to transition
 * `syncStatus` from `pending` → `synced` / `failed`. The UI reads `syncStatus`
 * and `lastSyncError` to show pending / synced / failed badges.
 */
export function useNutritionLogger(logDate: string): UseNutritionLoggerResult {
  const { user } = useAuth();
  const [record, setRecord] = useState<DailyNutritionRecord>(() => EMPTY(logDate));
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Tracks the latest `updatedAt` we've posted, so a stale resolve from an
  // earlier addEntry can't overwrite the status of a fresher record.
  const latestRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLastSyncError(null);
    getDay(logDate)
      .then((saved) => {
        if (cancelled) return;
        setRecord(saved ?? EMPTY(logDate));
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRecord(EMPTY(logDate));
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logDate]);

  const pushSync = useCallback(
    (next: DailyNutritionRecord) => {
      if (!user?.id) return;
      latestRef.current = next.updatedAt;
      queueNutritionSync({ userId: user.id, record: next })
        .then((result) => {
          if (latestRef.current !== next.updatedAt) return;
          if (result.outcome === 'synced') {
            setLastSyncError(null);
            setRecord((prev) =>
              prev.updatedAt === next.updatedAt
                ? { ...prev, syncStatus: 'synced' }
                : prev,
            );
          } else if (result.outcome === 'failed') {
            setLastSyncError(result.error ?? 'Unknown sync error');
            setRecord((prev) =>
              prev.updatedAt === next.updatedAt
                ? { ...prev, syncStatus: 'failed' }
                : prev,
            );
          }
        })
        .catch((err: unknown) => {
          if (latestRef.current !== next.updatedAt) return;
          const message = err instanceof Error ? err.message : String(err);
          setLastSyncError(message);
          setRecord((prev) =>
            prev.updatedAt === next.updatedAt
              ? { ...prev, syncStatus: 'failed' }
              : prev,
          );
        });
    },
    [user?.id],
  );

  const addEntry = useCallback(
    (delta: NutritionDelta) => {
      setRecord((prev) => {
        const next: DailyNutritionRecord = {
          ...prev,
          calories: prev.calories + (delta.calories ?? 0),
          proteinG: prev.proteinG + (delta.proteinG ?? 0),
          carbsG: prev.carbsG + (delta.carbsG ?? 0),
          fatG: prev.fatG + (delta.fatG ?? 0),
          notes: delta.notes ?? prev.notes,
          syncStatus: 'pending',
          updatedAt: new Date().toISOString(),
        };
        saveDay(next).catch(() => {});
        pushSync(next);
        return next;
      });
    },
    [pushSync],
  );

  const retrySync = useCallback(() => {
    if (!user?.id) return;
    setRecord((prev) => {
      if (prev.syncStatus === 'synced' || prev.syncStatus === 'local') return prev;
      const next: DailyNutritionRecord = {
        ...prev,
        syncStatus: 'pending',
        updatedAt: new Date().toISOString(),
      };
      saveDay(next).catch(() => {});
      pushSync(next);
      return next;
    });
  }, [pushSync, user?.id]);

  const reset = useCallback(() => {
    const next = EMPTY(logDate);
    latestRef.current = null;
    setLastSyncError(null);
    setRecord(next);
    saveDay(next).catch(() => {});
  }, [logDate]);

  return {
    record,
    syncStatus: record.syncStatus,
    lastSyncError,
    isLoading,
    addEntry,
    retrySync,
    reset,
  };
}
