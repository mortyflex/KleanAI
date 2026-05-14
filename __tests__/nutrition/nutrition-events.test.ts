import {
  buildSmoothingEvent,
  reportNutritionEvent,
  isAcknowledgedResult,
  DEFAULT_EXCESS_KCAL,
  NUTRITION_EVENT_TYPES,
  type NutritionEventResult,
} from '../../src/features/nutrition/utils/nutrition-events';
import type { NutritionSmoothingResult } from '../../src/types/smoothing.types';
import {
  CALORIE_FLOOR_FEMALE,
  CALORIE_FLOOR_MALE,
} from '../../src/utils/safety';

function expectNutritionSmoothing(
  result: NutritionEventResult,
): NutritionSmoothingResult {
  if (!result.ok || isAcknowledgedResult(result)) {
    throw new Error('expected nutrition smoothing result');
  }
  if (result.category !== 'nutrition') {
    throw new Error('expected nutrition category, got ' + result.category);
  }
  return result;
}

const FEMALE_CTX = { gender: 'female' as const, dailyKcalTarget: 1800 };
const MALE_CTX = { gender: 'male' as const, dailyKcalTarget: 2500 };

describe('buildSmoothingEvent — mapping', () => {
  it('returns null for followed_plan (no smoothing needed)', () => {
    expect(buildSmoothingEvent({ type: 'followed_plan' })).toBeNull();
  });

  it('uses the default excess for excess_food when kcal is omitted', () => {
    const event = buildSmoothingEvent({ type: 'excess_food' });
    expect(event).toEqual(
      expect.objectContaining({
        type: 'excess_food',
        excessKcal: DEFAULT_EXCESS_KCAL.excess_food,
      }),
    );
  });

  it('uses the default excess for ordered_food when kcal is omitted', () => {
    const event = buildSmoothingEvent({ type: 'ordered_food' });
    expect(event).toEqual(
      expect.objectContaining({
        type: 'ordered_food',
        excessKcal: DEFAULT_EXCESS_KCAL.ordered_food,
      }),
    );
  });

  it('uses the default excess for alcohol when kcal is omitted', () => {
    const event = buildSmoothingEvent({ type: 'alcohol' });
    expect(event).toEqual(
      expect.objectContaining({
        type: 'alcohol',
        excessKcal: DEFAULT_EXCESS_KCAL.alcohol,
      }),
    );
  });

  it('honours an explicit kcal override', () => {
    const event = buildSmoothingEvent({ type: 'excess_food', kcal: 750 });
    expect(event).toEqual(
      expect.objectContaining({ type: 'excess_food', excessKcal: 750 }),
    );
  });

  it('clamps negative kcal values to zero', () => {
    const event = buildSmoothingEvent({ type: 'alcohol', kcal: -200 });
    expect(event).toEqual(
      expect.objectContaining({ excessKcal: 0 }),
    );
  });

  it('emits a skipped_meal event with missedKcal (no compensation)', () => {
    const event = buildSmoothingEvent({ type: 'skipped_meal', kcal: 400 });
    expect(event).toEqual(
      expect.objectContaining({ type: 'skipped_meal', missedKcal: 400 }),
    );
  });

  it('forwards occurredAt onto the event when supplied', () => {
    const event = buildSmoothingEvent({
      type: 'excess_food',
      occurredAt: '2026-05-07T12:00:00Z',
    });
    expect(event?.occurredAt).toBe('2026-05-07T12:00:00Z');
  });
});

describe('reportNutritionEvent — followed_plan acknowledgment', () => {
  it('returns an acknowledged result with positive copy', () => {
    const result = reportNutritionEvent({ type: 'followed_plan' }, FEMALE_CTX);
    expect(isAcknowledgedResult(result)).toBe(true);
    if (isAcknowledgedResult(result)) {
      expect(result.eventType).toBe('followed_plan');
      expect(result.messageKey).toBe('nutrition.events.followed_plan.message');
    }
  });

  it('does NOT compensate by adjusting future days', () => {
    const result = reportNutritionEvent({ type: 'followed_plan' }, FEMALE_CTX);
    expect(isAcknowledgedResult(result)).toBe(true);
    // No `adjustments` field on acknowledged results.
    expect((result as unknown as { adjustments?: unknown }).adjustments).toBeUndefined();
  });
});

describe('reportNutritionEvent — connection to smoothing engine', () => {
  it('routes excess_food to the nutrition smoothing engine', () => {
    const r = expectNutritionSmoothing(
      reportNutritionEvent({ type: 'excess_food', kcal: 600 }, FEMALE_CTX),
    );
    expect(r.eventType).toBe('excess_food');
    expect(r.adjustments.length).toBeGreaterThan(0);
  });

  it('routes ordered_food through the engine and produces a 2–3 day spread', () => {
    const r = expectNutritionSmoothing(
      reportNutritionEvent({ type: 'ordered_food', kcal: 500 }, MALE_CTX),
    );
    expect(r.spreadDays).toBeGreaterThanOrEqual(2);
    expect(r.spreadDays).toBeLessThanOrEqual(3);
  });

  it('routes alcohol through the engine and respects the safety floor', () => {
    const r = expectNutritionSmoothing(
      reportNutritionEvent(
        { type: 'alcohol', kcal: 800 },
        { gender: 'female', dailyKcalTarget: CALORIE_FLOOR_FEMALE + 50 },
      ),
    );
    for (const adj of r.adjustments) {
      expect(adj.adjustedDailyTarget).toBeGreaterThanOrEqual(
        CALORIE_FLOOR_FEMALE,
      );
    }
  });

  it('skipped_meal returns no adjustments (zero-guilt — never compensates)', () => {
    const r = expectNutritionSmoothing(
      reportNutritionEvent({ type: 'skipped_meal', kcal: 400 }, FEMALE_CTX),
    );
    expect(r.adjustments).toEqual([]);
    expect(r.totalCompensatedKcal).toBe(0);
  });

  it('default excess kcal stays within engine-safe ranges', () => {
    for (const type of ['excess_food', 'ordered_food', 'alcohol'] as const) {
      const r = expectNutritionSmoothing(
        reportNutritionEvent({ type }, FEMALE_CTX),
      );
      expect(r.adjustments.length).toBeGreaterThan(0);
    }
  });
});

describe('reportNutritionEvent — safety floor across pathological contexts', () => {
  const cases = [
    { gender: 'female' as const, dailyKcalTarget: CALORIE_FLOOR_FEMALE },
    { gender: 'female' as const, dailyKcalTarget: CALORIE_FLOOR_FEMALE + 1 },
    { gender: 'male' as const, dailyKcalTarget: CALORIE_FLOOR_MALE },
    { gender: 'male' as const, dailyKcalTarget: CALORIE_FLOOR_MALE + 50 },
  ];

  it.each(cases)(
    'never drives the daily target below the floor for %p',
    (ctx) => {
      const r = expectNutritionSmoothing(
        reportNutritionEvent({ type: 'excess_food', kcal: 1500 }, ctx),
      );
      const floor = ctx.gender === 'male' ? CALORIE_FLOOR_MALE : CALORIE_FLOOR_FEMALE;
      for (const adj of r.adjustments) {
        expect(adj.adjustedDailyTarget).toBeGreaterThanOrEqual(floor);
      }
    },
  );
});

describe('NUTRITION_EVENT_TYPES — completeness', () => {
  it('lists exactly the five required event types', () => {
    expect(NUTRITION_EVENT_TYPES).toEqual([
      'followed_plan',
      'excess_food',
      'skipped_meal',
      'ordered_food',
      'alcohol',
    ]);
  });
});
