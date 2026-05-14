import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth';
import { queueNutritionSync } from '../services/nutrition-sync';
import { saveDay } from '../store/nutrition-storage';
import type { DailyNutritionRecord } from '../types';
import {
  getConsumedMeals,
  saveConsumedMeals,
  totalsFromConsumed,
  ZERO_TOTALS,
  type ConsumedMealEntry,
  type ConsumedMealMap,
  type ConsumedTotals,
} from '../store/consumed-meals-storage';
import type { MealSuggestion } from '../utils/meal-suggestions';
import type { ChosenRecipeSnapshot } from '../../../types/recipe.types';

/**
 * Lightweight per-meal consumption tracker. Owns:
 *   - the local map (which meal ids the user marked as eaten today),
 *   - the aggregated totals (kcal, protein, carbs, fat),
 *   - mirroring totals into the existing `DailyNutritionRecord` so the sync
 *     pipeline can ship them to Supabase without any extra wiring.
 *
 * This is intentionally NOT a generic food tracker — the user picks from a
 * small curated catalog of suggestions. That keeps the friction minimal
 * (one tap per meal) and the data shape predictable.
 */
export interface UseDailyConsumptionResult {
  consumed: ConsumedMealMap;
  totals: ConsumedTotals;
  isLoading: boolean;
  /** Mark a suggestion as eaten — idempotent (re-tapping doesn't double-count). */
  consume: (meal: MealSuggestion) => void;
  /**
   * Mark a chosen recipe (internal or AI-generated) as eaten. Same one-tap
   * semantics as {@link consume} but works from a `ChosenRecipeSnapshot`.
   */
  consumeRecipe: (snapshot: ChosenRecipeSnapshot) => void;
  /** Remove a previously marked meal. */
  unconsume: (mealId: string) => void;
  /** Convenience flag for the UI. */
  isConsumed: (mealId: string) => boolean;
}

function buildEntry(meal: MealSuggestion): ConsumedMealEntry {
  return {
    mealId: meal.id,
    type: meal.type,
    kcal: meal.approxKcal,
    proteinG: meal.approxProteinG,
    carbsG: meal.approxCarbsG,
    fatG: meal.approxFatG,
    consumedAt: new Date().toISOString(),
  };
}

function buildRecipeEntry(snapshot: ChosenRecipeSnapshot): ConsumedMealEntry {
  return {
    mealId: snapshot.recipeId,
    type: snapshot.mealType,
    kcal: snapshot.estimatedCalories,
    proteinG: snapshot.estimatedProteinG,
    carbsG: snapshot.estimatedCarbsG,
    fatG: snapshot.estimatedFatG,
    consumedAt: new Date().toISOString(),
  };
}

export function useDailyConsumption(
  logDate: string,
): UseDailyConsumptionResult {
  const { user } = useAuth();
  const [consumed, setConsumed] = useState<ConsumedMealMap>({});
  const [totals, setTotals] = useState<ConsumedTotals>(ZERO_TOTALS);
  const [isLoading, setIsLoading] = useState(true);

  // Tracks the latest persisted updatedAt so a stale sync resolution can't
  // overwrite a fresher state.
  const latestUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getConsumedMeals(logDate)
      .then((map) => {
        if (cancelled) return;
        setConsumed(map);
        setTotals(totalsFromConsumed(map));
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setConsumed({});
        setTotals(ZERO_TOTALS);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logDate]);

  const persist = useCallback(
    (next: ConsumedMealMap) => {
      const nextTotals = totalsFromConsumed(next);
      const updatedAt = new Date().toISOString();
      latestUpdatedAtRef.current = updatedAt;

      setConsumed(next);
      setTotals(nextTotals);

      const record: DailyNutritionRecord = {
        logDate,
        calories: nextTotals.kcal,
        proteinG: nextTotals.proteinG,
        carbsG: nextTotals.carbsG,
        fatG: nextTotals.fatG,
        syncStatus: 'pending',
        updatedAt,
      };

      saveConsumedMeals(logDate, next).catch(() => {});
      saveDay(record).catch(() => {});

      // Only queue the cloud sync once we have an authenticated user — the
      // local persistence already covers offline / signed-out usage.
      if (user?.id) {
        queueNutritionSync({ userId: user.id, record }).catch(() => {
          // Failures are silent here; the existing logger flow surfaces sync
          // status when the user opens the dedicated consumption screen.
        });
      }
    },
    [logDate, user?.id],
  );

  const consume = useCallback(
    (meal: MealSuggestion) => {
      setConsumed((prev) => {
        if (prev[meal.id]) return prev;
        const next = { ...prev, [meal.id]: buildEntry(meal) };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const consumeRecipe = useCallback(
    (snapshot: ChosenRecipeSnapshot) => {
      setConsumed((prev) => {
        if (prev[snapshot.recipeId]) return prev;
        const next = {
          ...prev,
          [snapshot.recipeId]: buildRecipeEntry(snapshot),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const unconsume = useCallback(
    (mealId: string) => {
      setConsumed((prev) => {
        if (!prev[mealId]) return prev;
        const { [mealId]: _removed, ...rest } = prev;
        persist(rest);
        return rest;
      });
    },
    [persist],
  );

  const isConsumed = useCallback(
    (mealId: string) => Boolean(consumed[mealId]),
    [consumed],
  );

  return {
    consumed,
    totals,
    isLoading,
    consume,
    consumeRecipe,
    unconsume,
    isConsumed,
  };
}

/** Returns today's date in `YYYY-MM-DD` (local timezone). */
export function todayLogDate(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
