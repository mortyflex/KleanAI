import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getConsumedMeals,
  saveConsumedMeals,
  clearConsumedMeals,
  totalsFromConsumed,
  ZERO_TOTALS,
  type ConsumedMealMap,
} from '../../src/features/nutrition/store/consumed-meals-storage';

const DATE = '2026-05-07';

const SAMPLE: ConsumedMealMap = {
  chicken_rice_bowl: {
    mealId: 'chicken_rice_bowl',
    type: 'lunch',
    kcal: 580,
    proteinG: 42,
    carbsG: 70,
    fatG: 12,
    consumedAt: '2026-05-07T13:00:00.000Z',
  },
  greek_yogurt_bowl: {
    mealId: 'greek_yogurt_bowl',
    type: 'breakfast',
    kcal: 320,
    proteinG: 24,
    carbsG: 38,
    fatG: 8,
    consumedAt: '2026-05-07T07:30:00.000Z',
  },
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('consumed-meals-storage round-trip', () => {
  it('returns an empty map when nothing has been saved yet', async () => {
    expect(await getConsumedMeals(DATE)).toEqual({});
  });

  it('persists and reloads a map for a given date', async () => {
    await saveConsumedMeals(DATE, SAMPLE);
    const reloaded = await getConsumedMeals(DATE);
    expect(reloaded).toEqual(SAMPLE);
  });

  it('clears the map for a given date', async () => {
    await saveConsumedMeals(DATE, SAMPLE);
    await clearConsumedMeals(DATE);
    expect(await getConsumedMeals(DATE)).toEqual({});
  });

  it('keeps maps for different dates isolated', async () => {
    await saveConsumedMeals(DATE, SAMPLE);
    await saveConsumedMeals('2026-05-08', {});
    expect(await getConsumedMeals(DATE)).toEqual(SAMPLE);
    expect(await getConsumedMeals('2026-05-08')).toEqual({});
  });

  it('falls back to an empty map when storage is corrupted', async () => {
    await AsyncStorage.setItem(`@klean_consumed_meals_${DATE}`, 'not json');
    expect(await getConsumedMeals(DATE)).toEqual({});
  });
});

describe('totalsFromConsumed', () => {
  it('returns zeroed totals for an empty map', () => {
    expect(totalsFromConsumed({})).toEqual(ZERO_TOTALS);
  });

  it('sums kcal + macros across every entry', () => {
    expect(totalsFromConsumed(SAMPLE)).toEqual({
      kcal: 580 + 320,
      proteinG: 42 + 24,
      carbsG: 70 + 38,
      fatG: 12 + 8,
    });
  });
});
