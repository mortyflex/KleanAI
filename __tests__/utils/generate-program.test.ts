import {
  generateProgram,
  selectSplit,
  maxExercisesFromDuration,
} from '../../src/features/workout/utils/generate-program';
import type { GenerateProgramParams } from '../../src/types/workout.types';

const gymBase: GenerateProgramParams = {
  fitnessLevel: 'intermediate',
  trainingDaysPerWeek: 3,
  sessionDurationMin: 45,
  trainingLocation: 'gym',
  durationWeeks: 12,
};

// ── selectSplit ────────────────────────────────────────────────────────────────

describe('selectSplit', () => {
  it('returns home for home location regardless of days', () => {
    expect(selectSplit({ ...gymBase, trainingLocation: 'home', trainingDaysPerWeek: 5 })).toBe('home');
    expect(selectSplit({ ...gymBase, trainingLocation: 'home', trainingDaysPerWeek: 2 })).toBe('home');
  });

  it('returns full_body_2 for 1-2 days at gym', () => {
    expect(selectSplit({ ...gymBase, trainingDaysPerWeek: 1 })).toBe('full_body_2');
    expect(selectSplit({ ...gymBase, trainingDaysPerWeek: 2 })).toBe('full_body_2');
  });

  it('returns full_body_3 for 3 days at gym', () => {
    expect(selectSplit({ ...gymBase, trainingDaysPerWeek: 3 })).toBe('full_body_3');
  });

  it('returns upper_lower_4 for 4 days at gym', () => {
    expect(selectSplit({ ...gymBase, trainingDaysPerWeek: 4 })).toBe('upper_lower_4');
  });

  it('returns push_pull_legs for 5+ days at gym', () => {
    expect(selectSplit({ ...gymBase, trainingDaysPerWeek: 5 })).toBe('push_pull_legs');
    expect(selectSplit({ ...gymBase, trainingDaysPerWeek: 6 })).toBe('push_pull_legs');
  });

  it('treats "both" location as gym for split selection', () => {
    expect(selectSplit({ ...gymBase, trainingLocation: 'both', trainingDaysPerWeek: 3 })).toBe('full_body_3');
  });
});

// ── maxExercisesFromDuration ───────────────────────────────────────────────────

describe('maxExercisesFromDuration', () => {
  it('returns 3 for < 30 min', () => {
    expect(maxExercisesFromDuration(20)).toBe(3);
    expect(maxExercisesFromDuration(29)).toBe(3);
  });

  it('returns 4 for 30-44 min', () => {
    expect(maxExercisesFromDuration(30)).toBe(4);
    expect(maxExercisesFromDuration(44)).toBe(4);
  });

  it('returns 6 for 45-59 min', () => {
    expect(maxExercisesFromDuration(45)).toBe(6);
    expect(maxExercisesFromDuration(59)).toBe(6);
  });

  it('returns 8 for >= 60 min', () => {
    expect(maxExercisesFromDuration(60)).toBe(8);
    expect(maxExercisesFromDuration(90)).toBe(8);
  });
});

// ── generateProgram — structure ────────────────────────────────────────────────

describe('generateProgram — output structure', () => {
  it('returns a program with exactly 7 days', () => {
    const program = generateProgram(gymBase);
    expect(program.days).toHaveLength(7);
  });

  it('uses the correct split', () => {
    expect(generateProgram({ ...gymBase, trainingDaysPerWeek: 3 }).split).toBe('full_body_3');
    expect(generateProgram({ ...gymBase, trainingDaysPerWeek: 4 }).split).toBe('upper_lower_4');
    expect(generateProgram({ ...gymBase, trainingLocation: 'home' }).split).toBe('home');
  });

  it('sets durationWeeks from params', () => {
    expect(generateProgram({ ...gymBase, durationWeeks: 8 }).durationWeeks).toBe(8);
  });

  it('defaults durationWeeks to 12 when not provided', () => {
    const { durationWeeks: _dw, ...noWeeks } = gymBase;
    expect(generateProgram(noWeeks).durationWeeks).toBe(12);
  });

  it('sets currentWeek to 1', () => {
    expect(generateProgram(gymBase).currentWeek).toBe(1);
  });

  it('assigns split-specific nameKey', () => {
    const program = generateProgram({ ...gymBase, trainingDaysPerWeek: 3 });
    expect(program.nameKey).toBe('workout.program.splits.full_body_3');
  });

  it('uses deterministic id (no Date.now variance)', () => {
    const a = generateProgram(gymBase);
    const b = generateProgram(gymBase);
    expect(a.id).toBe(b.id);
  });
});

// ── generateProgram — rest days ────────────────────────────────────────────────

describe('generateProgram — rest days', () => {
  it('marks unused days as rest days', () => {
    const program = generateProgram({ ...gymBase, trainingDaysPerWeek: 2 });
    const restDays = program.days.filter((d) => d.isRestDay);
    expect(restDays.length).toBe(5); // full_body_2 has 2 workout days
  });

  it('rest days have empty exercises array', () => {
    const program = generateProgram(gymBase);
    program.days
      .filter((d) => d.isRestDay)
      .forEach((d) => expect(d.exercises).toHaveLength(0));
  });

  it('rest days have the rest nameKey', () => {
    const program = generateProgram(gymBase);
    program.days
      .filter((d) => d.isRestDay)
      .forEach((d) => expect(d.nameKey).toBe('workout.program.days.rest'));
  });

  it('weekDayIndex is correct (0-6)', () => {
    const program = generateProgram(gymBase);
    program.days.forEach((d, i) => expect(d.weekDayIndex).toBe(i));
  });
});

// ── generateProgram — training days ───────────────────────────────────────────

describe('generateProgram — training days', () => {
  it('workout days have at least 1 exercise', () => {
    const program = generateProgram(gymBase);
    program.days
      .filter((d) => !d.isRestDay)
      .forEach((d) => expect(d.exercises.length).toBeGreaterThanOrEqual(1));
  });

  it('exercises do not exceed maxExercisesFromDuration', () => {
    const program = generateProgram({ ...gymBase, sessionDurationMin: 30 }); // max 4
    program.days
      .filter((d) => !d.isRestDay)
      .forEach((d) => expect(d.exercises.length).toBeLessThanOrEqual(4));
  });

  it('all exercises have done = false on generation', () => {
    const program = generateProgram(gymBase);
    program.days
      .filter((d) => !d.isRestDay)
      .flatMap((d) => d.exercises)
      .forEach((ex) => expect(ex.done).toBe(false));
  });

  it('all exercises have a nameKey', () => {
    const program = generateProgram(gymBase);
    program.days
      .filter((d) => !d.isRestDay)
      .flatMap((d) => d.exercises)
      .forEach((ex) => expect(ex.nameKey).toBeTruthy());
  });

  it('each day has durationMin > 0', () => {
    const program = generateProgram(gymBase);
    program.days
      .filter((d) => !d.isRestDay)
      .forEach((d) => expect(d.durationMin).toBeGreaterThan(0));
  });

  it('each day has a non-empty focus array', () => {
    const program = generateProgram(gymBase);
    program.days
      .filter((d) => !d.isRestDay)
      .forEach((d) => expect(d.focus.length).toBeGreaterThan(0));
  });
});

// ── generateProgram — fitness level volume ────────────────────────────────────

describe('generateProgram — fitness level adjustments', () => {
  it('beginner has fewer sets than intermediate', () => {
    const begProgram = generateProgram({ ...gymBase, fitnessLevel: 'beginner' });
    const intProgram = generateProgram({ ...gymBase, fitnessLevel: 'intermediate' });

    const begSets = begProgram.days
      .filter((d) => !d.isRestDay)
      .flatMap((d) => d.exercises)
      .reduce((sum, ex) => sum + ex.sets, 0);

    const intSets = intProgram.days
      .filter((d) => !d.isRestDay)
      .flatMap((d) => d.exercises)
      .reduce((sum, ex) => sum + ex.sets, 0);

    expect(intSets).toBeGreaterThan(begSets);
  });

  it('advanced has more sets than intermediate', () => {
    const intProgram = generateProgram({ ...gymBase, fitnessLevel: 'intermediate' });
    const advProgram = generateProgram({ ...gymBase, fitnessLevel: 'advanced' });

    const intSets = intProgram.days
      .filter((d) => !d.isRestDay)
      .flatMap((d) => d.exercises)
      .reduce((sum, ex) => sum + ex.sets, 0);

    const advSets = advProgram.days
      .filter((d) => !d.isRestDay)
      .flatMap((d) => d.exercises)
      .reduce((sum, ex) => sum + ex.sets, 0);

    expect(advSets).toBeGreaterThan(intSets);
  });
});

// ── generateProgram — template coverage ───────────────────────────────────────

describe('generateProgram — all templates', () => {
  const cases: [string, Partial<GenerateProgramParams>][] = [
    ['full_body_2', { trainingDaysPerWeek: 2 }],
    ['full_body_3', { trainingDaysPerWeek: 3 }],
    ['upper_lower_4', { trainingDaysPerWeek: 4 }],
    ['push_pull_legs', { trainingDaysPerWeek: 5 }],
    ['home', { trainingLocation: 'home' }],
  ];

  test.each(cases)('%s template generates a valid program', (_name, overrides) => {
    const program = generateProgram({ ...gymBase, ...overrides });
    expect(program.split).toBe(_name);
    expect(program.days).toHaveLength(7);
    const workoutDays = program.days.filter((d) => !d.isRestDay);
    expect(workoutDays.length).toBeGreaterThanOrEqual(2);
  });
});
