import {
  suggestSaferAlternatives,
  recommendedWeeksFor,
  MIN_RECOMMENDED_WEEKS,
  MAX_RECOMMENDED_WEEKS,
} from '../../src/utils/timeframe';
import { MAX_WEEKLY_WEIGHT_LOSS_KG } from '../../src/utils/safety';

describe('suggestSaferAlternatives', () => {
  it('computes saferWeeks for an unsafe short timeframe', () => {
    // 70 kg → 55 kg (15 kg), 4 weeks. maxSafeWeekly = min(1.0, 0.70) = 0.70
    // saferWeeks = ceil(15 / 0.70) = ceil(21.4) = 22
    const result = suggestSaferAlternatives({
      weightKg: 70,
      targetWeightKg: 55,
      targetTimeframeWeeks: 4,
    });
    expect(result.saferWeeks).toBeGreaterThan(4);
    expect(result.saferWeeks).toBe(22);
  });

  it('saferWeeklyLossKg never exceeds maxSafeWeeklyLoss', () => {
    const result = suggestSaferAlternatives({
      weightKg: 80,
      targetWeightKg: 65,
      targetTimeframeWeeks: 6,
    });
    expect(result.saferWeeklyLossKg).toBeLessThanOrEqual(result.maxSafeWeeklyLoss);
  });

  it('suggests kickstart for 4-week or shorter timeframe', () => {
    const result = suggestSaferAlternatives({
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframeWeeks: 4,
    });
    expect(result.suggestKickstart).toBe(true);
  });

  it('does not suggest kickstart for timeframes longer than 4 weeks', () => {
    const result = suggestSaferAlternatives({
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframeWeeks: 8,
    });
    expect(result.suggestKickstart).toBe(false);
  });

  it('partialProgressPossible is true when timeframe is shorter than saferWeeks', () => {
    // 70 → 55 kg (15 kg), saferWeeks = 22. 4 weeks < 22 → partial is possible
    const result = suggestSaferAlternatives({
      weightKg: 70,
      targetWeightKg: 55,
      targetTimeframeWeeks: 4,
    });
    expect(result.partialProgressPossible).toBe(true);
    expect(result.partialKgBeforeEvent).toBeGreaterThan(0);
    expect(result.partialKgBeforeEvent).toBeLessThan(15);
  });

  it('partialProgressPossible is false when no timeframe is given', () => {
    const result = suggestSaferAlternatives({
      weightKg: 70,
      targetWeightKg: 55,
      targetTimeframeWeeks: undefined,
    });
    expect(result.partialProgressPossible).toBe(false);
    expect(result.partialKgBeforeEvent).toBe(0);
  });

  it('partialProgressPossible is false when timeframe is already long enough', () => {
    // 70 → 68 kg (2 kg), saferWeeks = ceil(2 / 0.70) = 3. Timeframe 12 >= 3 → no partial needed
    const result = suggestSaferAlternatives({
      weightKg: 70,
      targetWeightKg: 68,
      targetTimeframeWeeks: 12,
    });
    expect(result.partialProgressPossible).toBe(false);
  });

  it('maxSafeWeeklyLoss applies 1% body weight rule for lighter persons', () => {
    // 60 kg: 1% = 0.60 kg/week < 1.0 cap
    const result = suggestSaferAlternatives({
      weightKg: 60,
      targetWeightKg: 50,
      targetTimeframeWeeks: 8,
    });
    expect(result.maxSafeWeeklyLoss).toBeCloseTo(0.6, 1);
    expect(result.maxSafeWeeklyLoss).toBeLessThan(MAX_WEEKLY_WEIGHT_LOSS_KG);
  });

  it('maxSafeWeeklyLoss caps at MAX_WEEKLY_WEIGHT_LOSS_KG for heavier persons', () => {
    // 110 kg: 1% = 1.10 kg/week > 1.0 cap → capped at 1.0
    const result = suggestSaferAlternatives({
      weightKg: 110,
      targetWeightKg: 95,
      targetTimeframeWeeks: 8,
    });
    expect(result.maxSafeWeeklyLoss).toBe(MAX_WEEKLY_WEIGHT_LOSS_KG);
  });

  it('handles a 100 kg person — 1% = 1 kg, exactly at the cap', () => {
    const result = suggestSaferAlternatives({
      weightKg: 100,
      targetWeightKg: 85,
      targetTimeframeWeeks: 8,
    });
    expect(result.maxSafeWeeklyLoss).toBe(MAX_WEEKLY_WEIGHT_LOSS_KG);
  });

  it('safer alternative suggestion shows correct partial kg for a wedding scenario', () => {
    // 75 kg → 65 kg (10 kg), 6 weeks (wedding). maxWeekly = min(1.0, 0.75) = 0.75
    // partial = 6 * 0.75 = 4.5 kg
    const result = suggestSaferAlternatives({
      weightKg: 75,
      targetWeightKg: 65,
      targetTimeframeWeeks: 6,
    });
    expect(result.partialKgBeforeEvent).toBeCloseTo(4.5, 1);
    expect(result.partialProgressPossible).toBe(true);
  });
});

describe('recommendedWeeksFor', () => {
  it('returns ceil(kgToLose / safe-weekly-loss) for weight loss', () => {
    // 70 kg → 65 kg : 5 / min(1.0, 0.7) = 5 / 0.7 = 7.14 → ceil = 8
    const weeks = recommendedWeeksFor({
      goal: 'lose_weight',
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(weeks).toBe(8);
  });

  it('returns ceil(kgToGain / MAX_WEEKLY_GAIN_KG) for weight gain', () => {
    // 70 kg → 75 kg : 5 / 0.5 = 10 weeks
    const weeks = recommendedWeeksFor({
      goal: 'gain_muscle',
      weightKg: 70,
      targetWeightKg: 75,
    });
    expect(weeks).toBe(10);
  });

  it('60 kg → 80 kg gain has a recommended timeframe far longer than 12 weeks', () => {
    // 20 kg / 0.5 = 40 weeks
    const weeks = recommendedWeeksFor({
      goal: 'gain_muscle',
      weightKg: 60,
      targetWeightKg: 80,
    });
    expect(weeks).toBeGreaterThan(12);
  });

  it('clamps below MIN_RECOMMENDED_WEEKS', () => {
    // 70 → 69 = 1 kg / 0.7 = 1.43 → ceil = 2 → clamped to MIN_RECOMMENDED_WEEKS
    const weeks = recommendedWeeksFor({
      goal: 'lose_weight',
      weightKg: 70,
      targetWeightKg: 69,
    });
    expect(weeks).toBe(MIN_RECOMMENDED_WEEKS);
  });

  it('falls back to 12 weeks for maintain or no target', () => {
    expect(recommendedWeeksFor({ goal: 'maintain', weightKg: 70 })).toBe(12);
    expect(
      recommendedWeeksFor({ goal: 'lose_weight', weightKg: 70, targetWeightKg: undefined })
    ).toBe(12);
  });

  it('never returns more than MAX_RECOMMENDED_WEEKS', () => {
    const weeks = recommendedWeeksFor({
      goal: 'lose_weight',
      weightKg: 200,
      targetWeightKg: 60,
    });
    expect(weeks).toBeLessThanOrEqual(MAX_RECOMMENDED_WEEKS);
  });

  it('respects 1% body weight rule for lighter users', () => {
    // 50 kg → 45 kg : 5 / min(1.0, 0.5) = 5 / 0.5 = 10 weeks
    const weeks = recommendedWeeksFor({
      goal: 'lose_weight',
      weightKg: 50,
      targetWeightKg: 45,
    });
    expect(weeks).toBe(10);
  });
});
