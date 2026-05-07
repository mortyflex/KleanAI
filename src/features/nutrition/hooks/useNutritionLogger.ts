import { useCallback, useEffect, useState } from 'react';
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
  isLoading: boolean;
  addEntry: (delta: NutritionDelta) => void;
  reset: () => void;
}

/**
 * Track today's nutrition totals offline-first. Each `addEntry` updates the
 * local record optimistically, persists to AsyncStorage, then enqueues a
 * Supabase upsert. The runner handles retries; the UI just reads `syncStatus`.
 */
export function useNutritionLogger(logDate: string): UseNutritionLoggerResult {
  const { user } = useAuth();
  const [record, setRecord] = useState<DailyNutritionRecord>(() => EMPTY(logDate));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
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
        if (user?.id) {
          queueNutritionSync({ userId: user.id, record: next }).catch(() => {});
        }
        return next;
      });
    },
    [user?.id],
  );

  const reset = useCallback(() => {
    const next = EMPTY(logDate);
    setRecord(next);
    saveDay(next).catch(() => {});
  }, [logDate]);

  return { record, syncStatus: record.syncStatus, isLoading, addEntry, reset };
}
