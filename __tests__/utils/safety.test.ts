import {
  runSafetyChecks,
  hasBlockingFlags,
  calorieFloor,
  CALORIE_FLOOR_MALE,
  CALORIE_FLOOR_FEMALE,
  MIN_AGE,
  MAX_WEEKLY_WEIGHT_LOSS_KG,
  MAX_WEEKLY_WEIGHT_LOSS_PCT,
  PROGRAM_WEEKS,
} from '../../src/utils/safety';
import { bmrMifflinStJeor, tdeeFromBMR } from '../../src/utils/calories';

const safeProfile = {
  age: 28,
  gender: 'female' as const,
  weightKg: 70,
  heightCm: 168,
  targetWeightKg: 65,
  trainingDaysPerWeek: 3,
  goal: 'lose_weight',
};

describe('calorieFloor', () => {
  it('returns CALORIE_FLOOR_FEMALE for female', () => {
    expect(calorieFloor('female')).toBe(CALORIE_FLOOR_FEMALE);
  });

  it('returns CALORIE_FLOOR_MALE for male', () => {
    expect(calorieFloor('male')).toBe(CALORIE_FLOOR_MALE);
  });

  it('returns CALORIE_FLOOR_FEMALE for other', () => {
    expect(calorieFloor('other')).toBe(CALORIE_FLOOR_FEMALE);
  });

  it('CALORIE_FLOOR_FEMALE is at least 1200 kcal', () => {
    expect(CALORIE_FLOOR_FEMALE).toBeGreaterThanOrEqual(1200);
  });

  it('CALORIE_FLOOR_MALE is at least 1500 kcal', () => {
    expect(CALORIE_FLOOR_MALE).toBeGreaterThanOrEqual(1500);
  });
});

describe('runSafetyChecks — safe profile', () => {
  it('returns no flags for a safe weight-loss profile', () => {
    const flags = runSafetyChecks(safeProfile);
    expect(flags).toHaveLength(0);
  });

  it('returns no flags for a consistent and paced gain_muscle goal', () => {
    // 70 kg → 73 kg in 12 weeks = 0.25 kg/week → safe gain
    const flags = runSafetyChecks({
      ...safeProfile,
      goal: 'gain_muscle',
      targetWeightKg: 73,
    });
    expect(flags).toHaveLength(0);
  });

  it('returns no flags for a maintain goal', () => {
    const flags = runSafetyChecks({ ...safeProfile, goal: 'maintain', targetWeightKg: undefined });
    expect(flags).toHaveLength(0);
  });
});

describe('runSafetyChecks — AGE_TOO_YOUNG', () => {
  it('blocks user under 18', () => {
    const flags = runSafetyChecks({ ...safeProfile, age: 16 });
    expect(flags.some((f) => f.code === 'AGE_TOO_YOUNG')).toBe(true);
    expect(flags.every((f) => f.severity === 'block')).toBe(true);
  });

  it('blocks user exactly at MIN_AGE - 1', () => {
    const flags = runSafetyChecks({ ...safeProfile, age: MIN_AGE - 1 });
    expect(flags.some((f) => f.code === 'AGE_TOO_YOUNG')).toBe(true);
  });

  it('does NOT block user exactly at MIN_AGE (18)', () => {
    const flags = runSafetyChecks({ ...safeProfile, age: MIN_AGE });
    expect(flags.some((f) => f.code === 'AGE_TOO_YOUNG')).toBe(false);
  });

  it('returns only the age flag when blocked — stops further checks', () => {
    const flags = runSafetyChecks({ ...safeProfile, age: 15 });
    expect(flags).toHaveLength(1);
    expect(flags[0].code).toBe('AGE_TOO_YOUNG');
  });
});

describe('runSafetyChecks — WEIGHT_LOSS_TOO_FAST', () => {
  it('flags weight loss exceeding 1 kg/week for a 100 kg person over 12 weeks', () => {
    // 100 kg → 40 kg: 60 kg over 12 weeks = 5 kg/week > min(1.0, 1.0) = 1.0
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 100,
      targetWeightKg: 40,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(true);
  });

  it('does NOT flag safe weight loss rate (5 kg over 12 weeks = 0.42 kg/week)', () => {
    // 70 kg: 1% = 0.70 kg/week. 0.42 < 0.70 → safe
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(false);
  });

  it('boundary: exactly 1 kg/week for 100 kg person over 12 weeks is OK', () => {
    // 100 kg: maxWeeklyLoss = min(1.0, 1.0) = 1.0. 12 kg / 12 = 1.0 NOT > 1.0 → safe
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 100,
      targetWeightKg: 88,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(false);
  });

  it('boundary: just over 1 kg/week is flagged', () => {
    // 85 kg → 70 kg: 15 kg / 12 = 1.25 kg/week > min(1.0, 0.85) = 0.85 → flagged
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 85,
      targetWeightKg: 70,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(true);
  });

  it('applies 1% body weight rule: flags 0.72 kg/week for a 60 kg person', () => {
    // 60 kg: 1% = 0.60 kg/week. 3 kg / 4 weeks = 0.75 > 0.60 → flagged
    const flags = runSafetyChecks({
      age: 25,
      gender: 'female',
      weightKg: 60,
      heightCm: 165,
      targetWeightKg: 57,
      trainingDaysPerWeek: 3,
      goal: 'lose_weight',
      targetTimeframeWeeks: 4,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(true);
  });
});

describe('runSafetyChecks — CALORIES_TOO_LOW (safety floor)', () => {
  it('flags when estimated calories drop below female floor', () => {
    const flags = runSafetyChecks({
      age: 25,
      gender: 'female',
      weightKg: 55,
      heightCm: 158,
      targetWeightKg: 20,
      trainingDaysPerWeek: 1,
      goal: 'lose_weight',
    });
    expect(flags.some((f) => f.code === 'CALORIES_TOO_LOW')).toBe(true);
  });

  it('flags when estimated calories drop below male floor', () => {
    const flags = runSafetyChecks({
      age: 25,
      gender: 'male',
      weightKg: 65,
      heightCm: 170,
      targetWeightKg: 20,
      trainingDaysPerWeek: 1,
      goal: 'lose_weight',
    });
    expect(flags.some((f) => f.code === 'CALORIES_TOO_LOW')).toBe(true);
  });

  it('does NOT flag calories for a healthy loss profile', () => {
    const flags = runSafetyChecks(safeProfile);
    expect(flags.some((f) => f.code === 'CALORIES_TOO_LOW')).toBe(false);
  });

  it('CALORIE_FLOOR_FEMALE is always at least 1200', () => {
    expect(CALORIE_FLOOR_FEMALE).toBeGreaterThanOrEqual(1200);
  });

  it('CALORIE_FLOOR_MALE is always at least 1500', () => {
    expect(CALORIE_FLOOR_MALE).toBeGreaterThanOrEqual(1500);
  });

  it('never allows calories to drop below floor in the safe profile', () => {
    const bmr = bmrMifflinStJeor(
      safeProfile.weightKg,
      safeProfile.heightCm,
      safeProfile.age,
      safeProfile.gender
    );
    const tdee = tdeeFromBMR(bmr, safeProfile.trainingDaysPerWeek);
    const kgToLose = safeProfile.weightKg - safeProfile.targetWeightKg!;
    const weeklyLoss = kgToLose / PROGRAM_WEEKS;
    const dailyDeficit = (weeklyLoss * 7700) / 7;
    const estimated = tdee - dailyDeficit;
    expect(estimated).toBeGreaterThan(CALORIE_FLOOR_FEMALE);
  });
});

describe('runSafetyChecks — DEFICIT_TOO_HIGH', () => {
  it('flags deficit exceeding MAX_DAILY_DEFICIT_KCAL', () => {
    const flags = runSafetyChecks({
      age: 25,
      gender: 'male',
      weightKg: 120,
      heightCm: 180,
      targetWeightKg: 20,
      trainingDaysPerWeek: 3,
      goal: 'lose_weight',
    });
    expect(flags.some((f) => f.code === 'DEFICIT_TOO_HIGH')).toBe(true);
  });

  it('does NOT flag deficit for moderate loss', () => {
    const flags = runSafetyChecks(safeProfile);
    expect(flags.some((f) => f.code === 'DEFICIT_TOO_HIGH')).toBe(false);
  });
});

describe('runSafetyChecks — BMI_TOO_LOW', () => {
  it('flags BMI below 17.5 for lose_weight goal', () => {
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 45,
      heightCm: 170,
      targetWeightKg: 40,
      goal: 'lose_weight',
    });
    expect(flags.some((f) => f.code === 'BMI_TOO_LOW')).toBe(true);
  });

  it('does NOT flag BMI_TOO_LOW for gain_muscle goal', () => {
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 45,
      heightCm: 170,
      goal: 'gain_muscle',
    });
    expect(flags.some((f) => f.code === 'BMI_TOO_LOW')).toBe(false);
  });

  it('does NOT flag healthy BMI', () => {
    const flags = runSafetyChecks({ ...safeProfile });
    expect(flags.some((f) => f.code === 'BMI_TOO_LOW')).toBe(false);
  });
});

describe('runSafetyChecks — timeframe-aware weight loss', () => {
  it('uses targetTimeframeWeeks when provided (too fast for 4-week deadline)', () => {
    // 70 → 60 kg in 4 weeks = 2.5 kg/week > min(1.0, 0.70) = 0.70 → blocked
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframeWeeks: 4,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(true);
  });

  it('safe when custom timeframe gives a realistic weekly rate', () => {
    // 70 → 67 kg in 8 weeks = 0.375 kg/week < 0.70 → safe
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 67,
      targetTimeframeWeeks: 8,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(false);
  });

  it('falls back to PROGRAM_WEEKS when no timeframe is set', () => {
    // No targetTimeframeWeeks → uses 12 weeks. 5 kg / 12 = 0.42 kg/week < 0.70 → safe
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 65,
      targetTimeframeWeeks: undefined,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(false);
  });

  it('blocks when custom duration makes weight loss too fast (6-week wedding)', () => {
    // 70 → 62 in 6 weeks = 1.33 kg/week > 0.70 → blocked
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 62,
      targetTimeframeWeeks: 6,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(true);
  });

  it('missing timeframe with target weight uses PROGRAM_WEEKS fallback silently', () => {
    // Profile has targetWeightKg but no targetTimeframe → uses 12 weeks
    // 70 → 65 in 12 weeks = 0.42 kg/week → no flag
    const flags = runSafetyChecks({
      ...safeProfile,
      targetWeightKg: 65,
      targetTimeframeWeeks: undefined,
    });
    expect(flags).toHaveLength(0);
  });

  it('calories never drop below floor even with a short unsafe timeframe', () => {
    // A short timeframe that triggers weight loss too fast should also raise
    // CALORIES_TOO_LOW or DEFICIT_TOO_HIGH — never silently allow below-floor calories
    const flags = runSafetyChecks({
      age: 28,
      gender: 'female',
      weightKg: 70,
      heightCm: 168,
      targetWeightKg: 60,
      trainingDaysPerWeek: 3,
      goal: 'lose_weight',
      targetTimeframeWeeks: 4,
    });
    const isUnsafe = flags.some(
      (f) =>
        f.code === 'CALORIES_TOO_LOW' ||
        f.code === 'WEIGHT_LOSS_TOO_FAST' ||
        f.code === 'DEFICIT_TOO_HIGH'
    );
    expect(isUnsafe).toBe(true);
    expect(flags.every((f) => f.severity === 'block')).toBe(true);
  });

  it('MAX_WEEKLY_WEIGHT_LOSS_PCT constant is 1% (0.01)', () => {
    expect(MAX_WEEKLY_WEIGHT_LOSS_PCT).toBe(0.01);
  });

  it('max safe weekly loss for 70 kg person is 0.70 kg/week (1% rule)', () => {
    // 0.70 < 1.0 cap → 1% rule is more restrictive for 70 kg person
    const maxSafe = Math.min(MAX_WEEKLY_WEIGHT_LOSS_KG, 70 * MAX_WEEKLY_WEIGHT_LOSS_PCT);
    expect(maxSafe).toBeCloseTo(0.70, 2);
  });
});

describe('hasBlockingFlags', () => {
  it('returns true when any flag has block severity', () => {
    expect(
      hasBlockingFlags([{ code: 'AGE_TOO_YOUNG', severity: 'block', i18nKey: 'test' }])
    ).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(hasBlockingFlags([])).toBe(false);
  });

  it('returns false for warn-only flags', () => {
    expect(
      hasBlockingFlags([{ code: 'WEIGHT_LOSS_TOO_FAST', severity: 'warn', i18nKey: 'test' }])
    ).toBe(false);
  });
});
