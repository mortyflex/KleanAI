import {
  runSafetyChecks,
  hasBlockingFlags,
  calorieFloor,
  CALORIE_FLOOR_MALE,
  CALORIE_FLOOR_FEMALE,
  MIN_AGE,
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

  it('returns no flags for a gain muscle goal', () => {
    const flags = runSafetyChecks({ ...safeProfile, goal: 'gain_muscle' });
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
  it('flags weight loss exceeding 1 kg/week over 12 weeks', () => {
    // 5 kg/week × 12 weeks = 60 kg to lose — clearly too fast
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 100,
      targetWeightKg: 40,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(true);
  });

  it('does NOT flag safe weight loss rate (5 kg over 12 weeks = 0.42 kg/week)', () => {
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(false);
  });

  it('boundary: exactly MAX_WEEKLY_WEIGHT_LOSS_KG * 12 kg total is OK', () => {
    // 1 kg/week * 12 weeks = 12 kg total
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 82,
      targetWeightKg: 70,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(false);
  });

  it('boundary: just over MAX_WEEKLY_WEIGHT_LOSS_KG * 12 is flagged', () => {
    const flags = runSafetyChecks({
      ...safeProfile,
      weightKg: 85,
      targetWeightKg: 70,
    });
    expect(flags.some((f) => f.code === 'WEIGHT_LOSS_TOO_FAST')).toBe(true);
  });
});

describe('runSafetyChecks — CALORIES_TOO_LOW (safety floor)', () => {
  it('flags when estimated calories drop below female floor', () => {
    // Use a small woman aiming for extreme weight loss
    const flags = runSafetyChecks({
      age: 25,
      gender: 'female',
      weightKg: 55,
      heightCm: 158,
      targetWeightKg: 20, // extreme, unrealistic
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
      targetWeightKg: 20, // extreme
      trainingDaysPerWeek: 1,
      goal: 'lose_weight',
    });
    expect(flags.some((f) => f.code === 'CALORIES_TOO_LOW')).toBe(true);
  });

  it('does NOT flag calories for a healthy loss profile', () => {
    // TDEE for 70kg/168cm/28yo female, 3 days = ~2107 kcal
    // 5kg over 12 weeks = 0.417 kg/week * 7700/7 = 458 kcal/day deficit
    // estimated = 2107 - 458 = ~1649 kcal — above 1200 floor
    const flags = runSafetyChecks(safeProfile);
    expect(flags.some((f) => f.code === 'CALORIES_TOO_LOW')).toBe(false);
  });

  it('CALORIE_FLOOR_FEMALE is always at least 1200', () => {
    expect(CALORIE_FLOOR_FEMALE).toBeGreaterThanOrEqual(1200);
  });

  it('CALORIE_FLOOR_MALE is always at least 1500', () => {
    expect(CALORIE_FLOOR_MALE).toBeGreaterThanOrEqual(1500);
  });

  it('never allows calories to drop below floor in safe profile', () => {
    // Verify safe profile doesn't violate floor
    const bmr = bmrMifflinStJeor(
      safeProfile.weightKg,
      safeProfile.heightCm,
      safeProfile.age,
      safeProfile.gender
    );
    const tdee = tdeeFromBMR(bmr, safeProfile.trainingDaysPerWeek);
    const kgToLose = safeProfile.weightKg - safeProfile.targetWeightKg!;
    const weeklyLoss = kgToLose / 12;
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
      targetWeightKg: 20, // extreme
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
    // 45kg / 1.70m^2 = 15.57 BMI
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
