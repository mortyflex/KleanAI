import {
  classifyGoal,
  MAINTAIN_TOLERANCE_KG,
  MAX_WEEKLY_GAIN_KG,
  AMBITIOUS_WEEKLY_GAIN_KG,
  UNSAFE_WEEKLY_GAIN_KG,
} from '../../src/utils/goal-classification';
import {
  CALORIE_FLOOR_FEMALE,
  CALORIE_FLOOR_MALE,
} from '../../src/utils/safety';

const baseLoss = {
  goal: 'lose_weight' as const,
  age: 28,
  gender: 'female' as const,
  weightKg: 70,
  heightCm: 168,
  targetWeightKg: 65,
  trainingDaysPerWeek: 3,
};

const baseGain = {
  goal: 'gain_muscle' as const,
  age: 28,
  gender: 'male' as const,
  weightKg: 75,
  heightCm: 180,
  targetWeightKg: 78,
  trainingDaysPerWeek: 4,
};

const baseMaintain = {
  goal: 'maintain' as const,
  age: 28,
  gender: 'female' as const,
  weightKg: 70,
  heightCm: 168,
  trainingDaysPerWeek: 3,
};

// ── Goal consistency ─────────────────────────────────────────────────────────

describe('classifyGoal — goal consistency', () => {
  it('flags weight loss with target above current weight as inconsistent', () => {
    const r = classifyGoal({ ...baseLoss, targetWeightKg: 75 });
    expect(r.kind).toBe('inconsistent');
    expect(r.flags.some((f) => f.code === 'GOAL_INCONSISTENT_LOSS')).toBe(true);
  });

  it('flags weight gain with target below current weight as inconsistent', () => {
    const r = classifyGoal({ ...baseGain, targetWeightKg: 70 });
    expect(r.kind).toBe('inconsistent');
    expect(r.flags.some((f) => f.code === 'GOAL_INCONSISTENT_GAIN')).toBe(true);
  });

  it('flags maintain with target far from current as inconsistent', () => {
    const r = classifyGoal({ ...baseMaintain, targetWeightKg: 80 });
    expect(r.kind).toBe('inconsistent');
    expect(r.flags.some((f) => f.code === 'GOAL_INCONSISTENT_MAINTAIN')).toBe(true);
  });

  it('does NOT flag maintain with target within tolerance', () => {
    const r = classifyGoal({
      ...baseMaintain,
      targetWeightKg: 70 + MAINTAIN_TOLERANCE_KG - 0.5,
    });
    expect(r.kind).toBe('valid');
    expect(r.flags.some((f) => f.code === 'GOAL_INCONSISTENT_MAINTAIN')).toBe(false);
  });

  it('inconsistent classifications block progression', () => {
    const r = classifyGoal({ ...baseLoss, targetWeightKg: 80 });
    expect(r.flags.every((f) => f.severity === 'block')).toBe(true);
  });
});

// ── Weight-gain pace ─────────────────────────────────────────────────────────

describe('classifyGoal — weight-gain pace', () => {
  it('60 kg → 80 kg in 12 weeks is NOT classified as valid', () => {
    const r = classifyGoal({
      ...baseGain,
      weightKg: 60,
      targetWeightKg: 80,
      targetTimeframeWeeks: 12,
    });
    expect(r.kind).not.toBe('valid');
    expect(r.kind).toBe('unsafe');
  });

  it('60 kg → 80 kg in 12 weeks raises WEIGHT_GAIN_TOO_FAST', () => {
    const r = classifyGoal({
      ...baseGain,
      weightKg: 60,
      targetWeightKg: 80,
      targetTimeframeWeeks: 12,
    });
    expect(r.flags.some((f) => f.code === 'WEIGHT_GAIN_TOO_FAST')).toBe(true);
  });

  it('classifies a steady gain (0.25 kg/week) as valid', () => {
    const r = classifyGoal({
      ...baseGain,
      weightKg: 75,
      targetWeightKg: 78, // 3 kg / 12 weeks = 0.25 kg/week
      targetTimeframeWeeks: 12,
    });
    expect(r.kind).toBe('valid');
  });

  it('classifies a moderately fast gain as ambitious (above safe threshold)', () => {
    const r = classifyGoal({
      ...baseGain,
      weightKg: 75,
      targetWeightKg: 84, // 9 kg / 12 weeks = 0.75 kg/week → ambitious
      targetTimeframeWeeks: 12,
    });
    expect(r.kind).toBe('ambitious');
  });

  it('blocks gain pace above UNSAFE_WEEKLY_GAIN_KG', () => {
    const r = classifyGoal({
      ...baseGain,
      weightKg: 70,
      targetWeightKg: 90, // 20 kg / 12 weeks ≈ 1.67 kg/week
      targetTimeframeWeeks: 12,
    });
    expect(r.kind).toBe('unsafe');
    expect(r.flags.some((f) => f.code === 'WEIGHT_GAIN_TOO_FAST')).toBe(true);
  });

  it('weight-gain thresholds are ordered safe < ambitious < unsafe', () => {
    expect(MAX_WEEKLY_GAIN_KG).toBeLessThanOrEqual(AMBITIOUS_WEEKLY_GAIN_KG);
    expect(AMBITIOUS_WEEKLY_GAIN_KG).toBeLessThan(UNSAFE_WEEKLY_GAIN_KG);
  });
});

// ── Weight-loss ambition ─────────────────────────────────────────────────────

describe('classifyGoal — weight-loss ambition', () => {
  it('classifies a moderately fast weight loss as ambitious (not unsafe)', () => {
    // 70 kg → 64 kg in 12 weeks = 0.5 kg/week. ambitiousWeekly=70*0.0075=0.525.
    // unsafeWeekly=min(1.0, 0.7)=0.7. 0.5 just below ambitious.
    // We want a clearly above-ambitious but below-unsafe pace:
    // 70 kg → 62 kg in 12 weeks = 0.667 kg/week → ambitious (between 0.525 and 0.7)
    const r = classifyGoal({
      ...baseLoss,
      weightKg: 70,
      targetWeightKg: 62,
      targetTimeframeWeeks: 12,
    });
    expect(r.kind).toBe('ambitious');
  });

  it('classifies a calm weight loss as valid', () => {
    const r = classifyGoal({ ...baseLoss }); // 5 kg / 12 weeks = 0.42 kg/week
    expect(r.kind).toBe('valid');
  });
});

// ── Calorie floor never breached silently ────────────────────────────────────

describe('classifyGoal — calorie floor', () => {
  it('estimated calories never go below the female floor', () => {
    const r = classifyGoal({
      ...baseLoss,
      gender: 'female',
      weightKg: 55,
      heightCm: 158,
      targetWeightKg: 30,
      targetTimeframeWeeks: 12,
    });
    expect(r.estimatedDailyCalories).toBeGreaterThanOrEqual(CALORIE_FLOOR_FEMALE);
    expect(r.flags.some((f) => f.code === 'CALORIES_TOO_LOW')).toBe(true);
  });

  it('estimated calories never go below the male floor', () => {
    const r = classifyGoal({
      ...baseLoss,
      gender: 'male',
      weightKg: 65,
      heightCm: 170,
      targetWeightKg: 30,
      targetTimeframeWeeks: 12,
    });
    expect(r.estimatedDailyCalories).toBeGreaterThanOrEqual(CALORIE_FLOOR_MALE);
    expect(r.flags.some((f) => f.code === 'CALORIES_TOO_LOW')).toBe(true);
  });

  it('reacts to changes in target weight (calorie estimate changes)', () => {
    const a = classifyGoal({ ...baseLoss, targetWeightKg: 67 });
    const b = classifyGoal({ ...baseLoss, targetWeightKg: 60 });
    expect(a.estimatedDailyCalories).not.toBe(b.estimatedDailyCalories);
  });

  it('reacts to changes in timeframe (calorie estimate changes)', () => {
    const a = classifyGoal({ ...baseLoss, targetTimeframeWeeks: 8 });
    const b = classifyGoal({ ...baseLoss, targetTimeframeWeeks: 24 });
    expect(a.estimatedDailyCalories).not.toBe(b.estimatedDailyCalories);
  });

  it('any unsafe target keeps the displayed calorie estimate at or above floor', () => {
    // Aggressive 4-week target — MUST be flagged AND target stays above floor.
    const r = classifyGoal({
      ...baseLoss,
      weightKg: 70,
      targetWeightKg: 50,
      targetTimeframeWeeks: 4,
    });
    expect(r.estimatedDailyCalories).toBeGreaterThanOrEqual(CALORIE_FLOOR_FEMALE);
    expect(r.kind).toBe('unsafe');
  });
});

// ── Inconsistent ⇏ unsafe ───────────────────────────────────────────────────

describe('classifyGoal — kind ordering', () => {
  it('inconsistent goal returns kind=inconsistent (not unsafe)', () => {
    const r = classifyGoal({ ...baseLoss, targetWeightKg: 80 });
    expect(r.kind).toBe('inconsistent');
  });

  it('age block always wins and returns kind=unsafe', () => {
    const r = classifyGoal({ ...baseLoss, age: 16 });
    expect(r.kind).toBe('unsafe');
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0].code).toBe('AGE_TOO_YOUNG');
  });
});
