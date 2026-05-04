import { bmrMifflinStJeor, tdeeFromBMR, bmi } from '../../src/utils/calories';

describe('bmrMifflinStJeor', () => {
  it('calculates BMR for a male', () => {
    // 80kg, 180cm, 30yo male
    // base = 10*80 + 6.25*180 - 5*30 = 800 + 1125 - 150 = 1775
    // male: 1775 + 5 = 1780
    expect(bmrMifflinStJeor(80, 180, 30, 'male')).toBe(1780);
  });

  it('calculates BMR for a female', () => {
    // 60kg, 165cm, 25yo female
    // base = 10*60 + 6.25*165 - 5*25 = 600 + 1031.25 - 125 = 1506.25
    // female: 1506.25 - 161 = 1345.25
    expect(bmrMifflinStJeor(60, 165, 25, 'female')).toBeCloseTo(1345.25, 1);
  });

  it('treats "other" gender as female formula', () => {
    const female = bmrMifflinStJeor(70, 170, 28, 'female');
    const other = bmrMifflinStJeor(70, 170, 28, 'other');
    expect(other).toBe(female);
  });

  it('returns a positive number for realistic inputs', () => {
    expect(bmrMifflinStJeor(50, 155, 20, 'female')).toBeGreaterThan(0);
    expect(bmrMifflinStJeor(120, 195, 40, 'male')).toBeGreaterThan(0);
  });
});

describe('tdeeFromBMR', () => {
  const bmr = 1800;

  it('applies sedentary factor for 0 days', () => {
    expect(tdeeFromBMR(bmr, 0)).toBe(Math.round(bmr * 1.2));
  });

  it('applies light factor for 1-2 days', () => {
    expect(tdeeFromBMR(bmr, 1)).toBe(Math.round(bmr * 1.375));
    expect(tdeeFromBMR(bmr, 2)).toBe(Math.round(bmr * 1.375));
  });

  it('applies moderate factor for 3-4 days', () => {
    expect(tdeeFromBMR(bmr, 3)).toBe(Math.round(bmr * 1.55));
    expect(tdeeFromBMR(bmr, 4)).toBe(Math.round(bmr * 1.55));
  });

  it('applies active factor for 5 days', () => {
    expect(tdeeFromBMR(bmr, 5)).toBe(Math.round(bmr * 1.725));
  });

  it('applies very active factor for 6+ days', () => {
    expect(tdeeFromBMR(bmr, 6)).toBe(Math.round(bmr * 1.9));
  });

  it('always returns a value greater than BMR', () => {
    for (const d of [0, 1, 3, 5, 6]) {
      expect(tdeeFromBMR(bmr, d)).toBeGreaterThan(bmr);
    }
  });
});

describe('bmi', () => {
  it('calculates BMI correctly for 80kg / 180cm', () => {
    // 80 / (1.8^2) = 80 / 3.24 ≈ 24.69
    expect(bmi(80, 180)).toBeCloseTo(24.69, 1);
  });

  it('identifies underweight range', () => {
    expect(bmi(45, 170)).toBeLessThan(17.5);
  });

  it('identifies healthy range', () => {
    const result = bmi(70, 175);
    expect(result).toBeGreaterThanOrEqual(18.5);
    expect(result).toBeLessThan(25);
  });
});
