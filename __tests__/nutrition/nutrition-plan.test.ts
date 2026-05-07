import {
  computeDailyPlan,
  planInputFromProfile,
  PROTEIN_PER_KG,
  HYDRATION_GLASSES_DEFAULT,
  type PlanInput,
} from '../../src/features/nutrition/utils/nutrition-plan';
import {
  CALORIE_FLOOR_FEMALE,
  CALORIE_FLOOR_MALE,
} from '../../src/utils/safety';

const MAINTAIN_FEMALE: PlanInput = {
  goal: 'maintain',
  gender: 'female',
  age: 30,
  weightKg: 65,
  heightCm: 168,
  trainingDaysPerWeek: 3,
};

const MAINTAIN_MALE: PlanInput = {
  goal: 'maintain',
  gender: 'male',
  age: 30,
  weightKg: 80,
  heightCm: 180,
  trainingDaysPerWeek: 3,
};

describe('computeDailyPlan — calorie + macro calculation', () => {
  it('returns calories close to TDEE for a maintain goal (female)', () => {
    const plan = computeDailyPlan(MAINTAIN_FEMALE);
    // Mifflin-St Jeor for 65 kg / 168 cm / 30 / female ≈ 1399 BMR.
    // TDEE at PAL 1.55 (3 training days) ≈ 2168.
    expect(plan.calories).toBeGreaterThan(1900);
    expect(plan.calories).toBeLessThan(2400);
    expect(plan.clampedToFloor).toBe(false);
  });

  it('uses 1.6 g/kg protein for maintain goals', () => {
    const plan = computeDailyPlan(MAINTAIN_FEMALE);
    expect(plan.proteinG).toBe(Math.round(65 * PROTEIN_PER_KG.maintain));
  });

  it('uses 2.0 g/kg protein for weight loss goals', () => {
    const plan = computeDailyPlan({
      ...MAINTAIN_FEMALE,
      goal: 'lose_weight',
      targetWeightKg: 60,
      targetTimeframeWeeks: 12,
    });
    expect(plan.proteinG).toBe(Math.round(65 * PROTEIN_PER_KG.lose_weight));
  });

  it('uses 1.8 g/kg protein for muscle-gain goals', () => {
    const plan = computeDailyPlan({
      ...MAINTAIN_MALE,
      goal: 'gain_muscle',
      targetWeightKg: 84,
      targetTimeframeWeeks: 16,
    });
    expect(plan.proteinG).toBe(Math.round(80 * PROTEIN_PER_KG.gain_muscle));
  });

  it('uses 2.0 g/kg protein for recomposition goals', () => {
    const plan = computeDailyPlan({
      ...MAINTAIN_MALE,
      goal: 'recomposition',
    });
    expect(plan.proteinG).toBe(Math.round(80 * PROTEIN_PER_KG.recomposition));
  });

  it('produces a deficit relative to maintenance for a weight-loss target', () => {
    const maintain = computeDailyPlan(MAINTAIN_FEMALE);
    const cutting = computeDailyPlan({
      ...MAINTAIN_FEMALE,
      goal: 'lose_weight',
      targetWeightKg: 60,
      targetTimeframeWeeks: 12,
    });
    expect(cutting.calories).toBeLessThan(maintain.calories);
  });

  it('produces a surplus relative to maintenance for a muscle-gain target', () => {
    const maintain = computeDailyPlan(MAINTAIN_MALE);
    const bulking = computeDailyPlan({
      ...MAINTAIN_MALE,
      goal: 'gain_muscle',
      targetWeightKg: 85,
      targetTimeframeWeeks: 16,
    });
    expect(bulking.calories).toBeGreaterThan(maintain.calories);
  });

  it('rounds carbs and fat to whole grams', () => {
    const plan = computeDailyPlan(MAINTAIN_FEMALE);
    expect(Number.isInteger(plan.carbsG)).toBe(true);
    expect(Number.isInteger(plan.fatG)).toBe(true);
    expect(Number.isInteger(plan.proteinG)).toBe(true);
  });

  it('keeps carbs >= 0 even when protein + fat would otherwise exceed calories', () => {
    // Forced extreme: very heavy user on a clamped female-floor plan.
    const plan = computeDailyPlan({
      goal: 'lose_weight',
      gender: 'female',
      age: 25,
      weightKg: 200,
      heightCm: 160,
      trainingDaysPerWeek: 0,
      targetWeightKg: 80,
      targetTimeframeWeeks: 4, // absurd, will clamp to floor
    });
    expect(plan.carbsG).toBeGreaterThanOrEqual(0);
    expect(plan.calories).toBe(CALORIE_FLOOR_FEMALE);
  });

  it('forwards dietary restrictions onto the plan output', () => {
    const plan = computeDailyPlan({
      ...MAINTAIN_FEMALE,
      restrictions: ['vegetarian', 'gluten_free'],
    });
    expect(plan.restrictions).toEqual(['vegetarian', 'gluten_free']);
  });

  it('returns 8 glasses as the default hydration target', () => {
    const plan = computeDailyPlan(MAINTAIN_FEMALE);
    expect(plan.hydrationGlasses).toBe(HYDRATION_GLASSES_DEFAULT);
  });
});

describe('computeDailyPlan — never goes below the safety floor', () => {
  it('clamps a female plan to CALORIE_FLOOR_FEMALE when the cut is aggressive', () => {
    const plan = computeDailyPlan({
      goal: 'lose_weight',
      gender: 'female',
      age: 22,
      weightKg: 55,
      heightCm: 162,
      trainingDaysPerWeek: 0,
      targetWeightKg: 45,
      targetTimeframeWeeks: 4,
    });
    expect(plan.calories).toBe(CALORIE_FLOOR_FEMALE);
    expect(plan.clampedToFloor).toBe(true);
  });

  it('clamps a male plan to CALORIE_FLOOR_MALE when the cut is aggressive', () => {
    const plan = computeDailyPlan({
      goal: 'lose_weight',
      gender: 'male',
      age: 22,
      weightKg: 70,
      heightCm: 175,
      trainingDaysPerWeek: 0,
      targetWeightKg: 55,
      targetTimeframeWeeks: 4,
    });
    expect(plan.calories).toBe(CALORIE_FLOOR_MALE);
    expect(plan.clampedToFloor).toBe(true);
  });

  it('never returns a calorie value below the gender-specific floor (fuzzy)', () => {
    // Sweep a few pathological inputs to be sure.
    const inputs: PlanInput[] = [
      { goal: 'lose_weight', gender: 'female', age: 18, weightKg: 50, heightCm: 155, trainingDaysPerWeek: 0, targetWeightKg: 40, targetTimeframeWeeks: 4 },
      { goal: 'lose_weight', gender: 'female', age: 60, weightKg: 90, heightCm: 160, trainingDaysPerWeek: 0, targetWeightKg: 60, targetTimeframeWeeks: 6 },
      { goal: 'lose_weight', gender: 'male',   age: 20, weightKg: 65, heightCm: 170, trainingDaysPerWeek: 0, targetWeightKg: 55, targetTimeframeWeeks: 3 },
      { goal: 'lose_weight', gender: 'male',   age: 50, weightKg: 110, heightCm: 178, trainingDaysPerWeek: 0, targetWeightKg: 70, targetTimeframeWeeks: 6 },
    ];
    for (const input of inputs) {
      const plan = computeDailyPlan(input);
      const floor = input.gender === 'male' ? CALORIE_FLOOR_MALE : CALORIE_FLOOR_FEMALE;
      expect(plan.calories).toBeGreaterThanOrEqual(floor);
    }
  });

  it('does not clamp when the cut is gentle', () => {
    const plan = computeDailyPlan({
      goal: 'lose_weight',
      gender: 'female',
      age: 30,
      weightKg: 75,
      heightCm: 170,
      trainingDaysPerWeek: 4,
      targetWeightKg: 70,
      targetTimeframeWeeks: 12,
    });
    expect(plan.clampedToFloor).toBe(false);
    expect(plan.calories).toBeGreaterThan(CALORIE_FLOOR_FEMALE);
  });

  it('floor field on the plan matches the gender-specific floor', () => {
    expect(computeDailyPlan(MAINTAIN_FEMALE).floor).toBe(CALORIE_FLOOR_FEMALE);
    expect(computeDailyPlan(MAINTAIN_MALE).floor).toBe(CALORIE_FLOOR_MALE);
  });

  it('clamps to floor when timeframe is zero or negative (defensive)', () => {
    const plan = computeDailyPlan({
      goal: 'lose_weight',
      gender: 'female',
      age: 30,
      weightKg: 70,
      heightCm: 165,
      trainingDaysPerWeek: 3,
      targetWeightKg: 60,
      targetTimeframeWeeks: 0,
    });
    // With weeks <= 0 we ignore the deficit and fall back to TDEE — must
    // still respect the floor.
    expect(plan.calories).toBeGreaterThanOrEqual(CALORIE_FLOOR_FEMALE);
  });
});

describe('planInputFromProfile', () => {
  it('returns null when required fields are missing', () => {
    expect(planInputFromProfile({})).toBeNull();
    expect(
      planInputFromProfile({ goal: 'maintain', gender: 'female' }),
    ).toBeNull();
  });

  it('builds a complete PlanInput from a complete profile', () => {
    const input = planInputFromProfile({
      goal: 'lose_weight',
      gender: 'female',
      age: 30,
      weightKg: 65,
      heightCm: 168,
      trainingDaysPerWeek: 3,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 12 },
      dietaryRestrictions: ['vegetarian'],
    });
    expect(input).not.toBeNull();
    expect(input?.targetTimeframeWeeks).toBe(12);
    expect(input?.restrictions).toEqual(['vegetarian']);
  });
});
