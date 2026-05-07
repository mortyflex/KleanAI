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
import {
  useDailyConsumption,
  todayLogDate,
} from '../../src/features/nutrition/hooks/useDailyConsumption';
// eslint-disable-next-line import/first
import {
  getConsumedMeals,
  saveConsumedMeals,
} from '../../src/features/nutrition/store/consumed-meals-storage';
// eslint-disable-next-line import/first
import { getDay } from '../../src/features/nutrition/store/nutrition-storage';
// eslint-disable-next-line import/first
import type { MealSuggestion } from '../../src/features/nutrition/utils/meal-suggestions';

const TODAY = '2026-05-07';

const CHICKEN: MealSuggestion = {
  id: 'chicken_rice_bowl',
  type: 'lunch',
  titleKey: 'nutrition.suggestions.meals.chicken_rice_bowl.title',
  bodyKey: 'nutrition.suggestions.meals.chicken_rice_bowl.body',
  approxKcal: 580,
  approxProteinG: 42,
  approxCarbsG: 70,
  approxFatG: 12,
  compatibleWith: [],
  conflictsWith: ['vegetarian', 'vegan'],
  emoji: '🍗',
};

const YOGURT: MealSuggestion = {
  id: 'greek_yogurt_bowl',
  type: 'breakfast',
  titleKey: 'nutrition.suggestions.meals.greek_yogurt_bowl.title',
  bodyKey: 'nutrition.suggestions.meals.greek_yogurt_bowl.body',
  approxKcal: 320,
  approxProteinG: 24,
  approxCarbsG: 38,
  approxFatG: 8,
  compatibleWith: [],
  conflictsWith: ['vegan', 'lactose_free'],
  emoji: '🥛',
};

describe('useDailyConsumption', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockQueueNutritionSync.mockReset();
    mockQueueNutritionSync.mockReturnValue(new Promise<never>(() => {}));
  });

  it('starts empty for an unseen day', async () => {
    const { result } = renderHook(() => useDailyConsumption(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.consumed).toEqual({});
    expect(result.current.totals).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  it('reloads previously consumed meals on mount', async () => {
    await saveConsumedMeals(TODAY, {
      chicken_rice_bowl: {
        mealId: 'chicken_rice_bowl',
        type: 'lunch',
        kcal: 580,
        proteinG: 42,
        carbsG: 70,
        fatG: 12,
        consumedAt: '2026-05-07T13:00:00.000Z',
      },
    });
    const { result } = renderHook(() => useDailyConsumption(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totals.kcal).toBe(580);
    expect(result.current.isConsumed('chicken_rice_bowl')).toBe(true);
  });

  it('consume() adds the meal, updates totals, persists locally and queues sync', async () => {
    const { result } = renderHook(() => useDailyConsumption(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.consume(CHICKEN);
    });

    expect(result.current.totals).toEqual({
      kcal: 580,
      proteinG: 42,
      carbsG: 70,
      fatG: 12,
    });
    expect(result.current.isConsumed('chicken_rice_bowl')).toBe(true);

    await waitFor(async () => {
      const stored = await getConsumedMeals(TODAY);
      expect(stored.chicken_rice_bowl).toBeDefined();
    });
    await waitFor(async () => {
      const day = await getDay(TODAY);
      expect(day?.calories).toBe(580);
      expect(day?.syncStatus).toBe('pending');
    });
    expect(mockQueueNutritionSync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'test-user' }),
    );
  });

  it('consume() is idempotent — re-tapping the same meal does not double-count', async () => {
    const { result } = renderHook(() => useDailyConsumption(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.consume(CHICKEN);
    });
    act(() => {
      result.current.consume(CHICKEN);
    });

    expect(result.current.totals.kcal).toBe(580);
  });

  it('unconsume() removes the meal and decrements totals', async () => {
    const { result } = renderHook(() => useDailyConsumption(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.consume(CHICKEN);
      result.current.consume(YOGURT);
    });
    expect(result.current.totals.kcal).toBe(580 + 320);

    act(() => {
      result.current.unconsume('chicken_rice_bowl');
    });

    expect(result.current.isConsumed('chicken_rice_bowl')).toBe(false);
    expect(result.current.isConsumed('greek_yogurt_bowl')).toBe(true);
    expect(result.current.totals).toEqual({
      kcal: 320,
      proteinG: 24,
      carbsG: 38,
      fatG: 8,
    });
  });

  it('unconsume() on an unknown meal id is a no-op', async () => {
    const { result } = renderHook(() => useDailyConsumption(TODAY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.unconsume('unknown_meal');
    });

    expect(result.current.totals.kcal).toBe(0);
  });
});

describe('todayLogDate', () => {
  it('returns YYYY-MM-DD with leading zeros', () => {
    expect(todayLogDate(new Date('2026-01-09T12:00:00'))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(todayLogDate(new Date(2026, 4, 7))).toBe('2026-05-07');
  });
});
