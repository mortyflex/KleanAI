import {
  smoothNutrition,
  NUTRITION_SMOOTHING,
} from '../../src/features/smoothing/utils/nutrition-smoothing';
import {
  CALORIE_FLOOR_FEMALE,
  CALORIE_FLOOR_MALE,
  calorieFloor,
} from '../../src/utils/safety';

const FEMALE_CTX = { gender: 'female' as const, dailyKcalTarget: 1800 };
const MALE_CTX = { gender: 'male' as const, dailyKcalTarget: 2400 };

describe('smoothNutrition — default 72h spread', () => {
  it('defaults to a 3-day spread (72h) for excess food', () => {
    const result = smoothNutrition({
      excessKcal: 600,
      context: FEMALE_CTX,
      eventType: 'excess_food',
    });
    expect(result.spreadDays).toBe(3);
    expect(result.adjustments).toHaveLength(3);
  });

  it('spreads a 600 kcal excess as ~200 kcal/day across 3 days', () => {
    const result = smoothNutrition({
      excessKcal: 600,
      context: FEMALE_CTX,
      eventType: 'excess_food',
    });
    expect(result.adjustments.every((a) => a.kcalDelta === -200)).toBe(true);
    expect(result.totalCompensatedKcal).toBe(600);
    expect(result.unaddressedKcal).toBe(0);
    expect(result.hitFloor).toBe(false);
  });

  it('honours a 2-day spread (48h) when explicitly requested', () => {
    const result = smoothNutrition({
      excessKcal: 400,
      context: FEMALE_CTX,
      eventType: 'excess_food',
      spreadDays: 2,
    });
    expect(result.spreadDays).toBe(2);
    expect(result.adjustments).toHaveLength(2);
    expect(result.adjustments.every((a) => a.kcalDelta === -200)).toBe(true);
  });

  it('clamps spread to the 2–3 day window even when called with bad input', () => {
    const r1 = smoothNutrition({
      excessKcal: 300,
      context: FEMALE_CTX,
      eventType: 'excess_food',
      spreadDays: 1,
    });
    expect(r1.spreadDays).toBe(NUTRITION_SMOOTHING.MIN_SPREAD_DAYS);

    const r2 = smoothNutrition({
      excessKcal: 300,
      context: FEMALE_CTX,
      eventType: 'excess_food',
      spreadDays: 7,
    });
    expect(r2.spreadDays).toBe(NUTRITION_SMOOTHING.MAX_SPREAD_DAYS);
  });

  it('uses dayOffset 0/1/2 for the 3-day spread (today, +1, +2)', () => {
    const result = smoothNutrition({
      excessKcal: 300,
      context: FEMALE_CTX,
      eventType: 'excess_food',
    });
    expect(result.adjustments.map((a) => a.dayOffset)).toEqual([0, 1, 2]);
  });

  it('returns a no-op for very small excesses (zero-guilt threshold)', () => {
    const result = smoothNutrition({
      excessKcal: 30,
      context: FEMALE_CTX,
      eventType: 'excess_food',
    });
    expect(result.adjustments).toEqual([]);
    expect(result.totalCompensatedKcal).toBe(0);
  });
});

describe('smoothNutrition — never goes below the safety floor', () => {
  it('caps daily compensation so the adjusted target stays at or above the female floor', () => {
    // Daily target = 1300, female floor = 1200 → headroom = 100 kcal/day max.
    const ctx = { gender: 'female' as const, dailyKcalTarget: 1300 };
    const result = smoothNutrition({
      excessKcal: 900,
      context: ctx,
      eventType: 'excess_food',
    });
    expect(result.hitFloor).toBe(true);
    for (const adj of result.adjustments) {
      expect(adj.adjustedDailyTarget).toBeGreaterThanOrEqual(CALORIE_FLOOR_FEMALE);
      expect(Math.abs(adj.kcalDelta)).toBeLessThanOrEqual(100);
    }
  });

  it('caps daily compensation so the adjusted target stays at or above the male floor', () => {
    // Daily target = 1600, male floor = 1500 → headroom = 100 kcal/day max.
    const ctx = { gender: 'male' as const, dailyKcalTarget: 1600 };
    const result = smoothNutrition({
      excessKcal: 1200,
      context: ctx,
      eventType: 'ordered_food',
    });
    expect(result.hitFloor).toBe(true);
    for (const adj of result.adjustments) {
      expect(adj.adjustedDailyTarget).toBeGreaterThanOrEqual(CALORIE_FLOOR_MALE);
    }
  });

  it('reports unaddressed kcal when the floor prevents full compensation', () => {
    const ctx = { gender: 'female' as const, dailyKcalTarget: 1300 };
    const result = smoothNutrition({
      excessKcal: 900,
      context: ctx,
      eventType: 'excess_food',
    });
    // 100 kcal/day × 3 days = 300 kcal compensated; 600 left unaddressed.
    expect(result.totalCompensatedKcal).toBeLessThan(900);
    expect(result.unaddressedKcal).toBe(900 - result.totalCompensatedKcal);
    expect(result.unaddressedKcal).toBeGreaterThan(0);
  });

  it('never asks for a daily cut larger than the non-aggressive cap', () => {
    // Even with massive headroom, we should never hit per-day adjustments
    // beyond MAX_DAILY_COMPENSATION_KCAL — that would feel punishing.
    const ctx = { gender: 'male' as const, dailyKcalTarget: 3500 };
    const result = smoothNutrition({
      excessKcal: 1500,
      context: ctx,
      eventType: 'excess_food',
    });
    for (const adj of result.adjustments) {
      expect(Math.abs(adj.kcalDelta)).toBeLessThanOrEqual(
        NUTRITION_SMOOTHING.MAX_DAILY_COMPENSATION_KCAL,
      );
    }
  });

  it('returns hitFloor=false when the user has plenty of headroom', () => {
    const result = smoothNutrition({
      excessKcal: 300,
      context: FEMALE_CTX,
      eventType: 'excess_food',
    });
    expect(result.hitFloor).toBe(false);
    expect(result.unaddressedKcal).toBe(0);
  });

  it('floor field on result matches calorieFloor() for the gender', () => {
    expect(
      smoothNutrition({ excessKcal: 200, context: FEMALE_CTX, eventType: 'excess_food' }).floor,
    ).toBe(calorieFloor('female'));
    expect(
      smoothNutrition({ excessKcal: 200, context: MALE_CTX, eventType: 'ordered_food' }).floor,
    ).toBe(calorieFloor('male'));
  });

  it('refuses to drive a target below the floor when it is already AT the floor', () => {
    // dailyTarget == floor → no headroom → no compensation at all
    const ctx = { gender: 'female' as const, dailyKcalTarget: CALORIE_FLOOR_FEMALE };
    const result = smoothNutrition({
      excessKcal: 600,
      context: ctx,
      eventType: 'excess_food',
    });
    expect(result.totalCompensatedKcal).toBe(0);
    expect(result.unaddressedKcal).toBe(600);
    expect(result.hitFloor).toBe(true);
    for (const adj of result.adjustments) {
      expect(adj.adjustedDailyTarget).toBeGreaterThanOrEqual(CALORIE_FLOOR_FEMALE);
    }
  });
});

describe('smoothNutrition — zero-guilt copy mapping', () => {
  it('returns the excess_food message+recommendation keys', () => {
    const result = smoothNutrition({
      excessKcal: 300,
      context: FEMALE_CTX,
      eventType: 'excess_food',
    });
    expect(result.messageKey).toBe('smoothing.events.excess_food.message');
    expect(result.recommendationKey).toBe('smoothing.events.excess_food.recommendation');
  });

  it('returns the alcohol message+recommendation keys', () => {
    const result = smoothNutrition({
      excessKcal: 300,
      context: FEMALE_CTX,
      eventType: 'alcohol',
    });
    expect(result.messageKey).toBe('smoothing.events.alcohol.message');
    expect(result.recommendationKey).toBe('smoothing.events.alcohol.recommendation');
  });

  it('skipped_meal returns no adjustments — never compensates by cutting more', () => {
    const result = smoothNutrition({
      excessKcal: 0,
      context: FEMALE_CTX,
      eventType: 'skipped_meal',
    });
    expect(result.adjustments).toEqual([]);
    expect(result.totalCompensatedKcal).toBe(0);
    expect(result.messageKey).toBe('smoothing.events.skipped_meal.message');
  });
});

describe('smoothNutrition — defensive inputs', () => {
  it('treats negative excessKcal as zero', () => {
    const result = smoothNutrition({
      excessKcal: -500,
      context: FEMALE_CTX,
      eventType: 'excess_food',
    });
    expect(result.totalExcessKcal).toBe(0);
    expect(result.adjustments).toEqual([]);
  });
});
