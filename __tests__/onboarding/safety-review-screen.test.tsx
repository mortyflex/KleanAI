import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingContext } from '../../src/features/onboarding/onboarding-context';
import SafetyReviewScreen from '../../app/(onboarding)/safety-review';
import {
  AuthContext,
  type AuthContextValue,
} from '../../src/features/auth';
import type { OnboardingProfile } from '../../src/types/profile.types';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));

const noopAuth: AuthContextValue = {
  status: 'unauthenticated',
  session: null,
  user: null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(async () => undefined),
  refresh: jest.fn(async () => undefined),
};

function renderWithProfile(
  profile: Partial<OnboardingProfile>,
  authOverrides: Partial<AuthContextValue> = {},
) {
  const updateProfile = jest.fn();
  const resetProfile = jest.fn();
  const auth: AuthContextValue = { ...noopAuth, ...authOverrides };
  return render(
    <AuthContext.Provider value={auth}>
      <OnboardingContext.Provider value={{ profile, updateProfile, resetProfile }}>
        <SafetyReviewScreen />
      </OnboardingContext.Provider>
    </AuthContext.Provider>
  );
}

const safeProfile: Partial<OnboardingProfile> = {
  age: 28,
  gender: 'female',
  weightKg: 70,
  heightCm: 168,
  targetWeightKg: 65,
  trainingDaysPerWeek: 3,
  goal: 'lose_weight',
};

describe('SafetyReviewScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders without crashing', () => {
    renderWithProfile(safeProfile);
  });

  it('routes unauthenticated users to /(auth)/register on continue (account before summary)', () => {
    renderWithProfile(safeProfile);
    fireEvent.press(screen.getByTestId('safety-cta-primary'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(auth)/register?intent=save-onboarding',
    );
  });

  it('routes already-authenticated users straight to the summary recap', () => {
    renderWithProfile(safeProfile, {
      status: 'authenticated',
      user: { id: 'u-1', email: 'a@b.com' } as never,
      session: {
        access_token: 'tok',
        refresh_token: 'rtok',
        user: { id: 'u-1' },
      } as never,
    });
    fireEvent.press(screen.getByTestId('safety-cta-primary'));
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/summary');
  });

  it('shows step 9 of 10 indicator', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByText(/Step 9 of 10/i)).toBeTruthy();
  });

  it('shows valid kind for a calm goal', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByTestId('safety-all-good')).toBeTruthy();
    expect(screen.getByTestId('safety-cta-primary')).toBeTruthy();
  });

  it('shows the calorie preview card', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByTestId('calorie-preview')).toBeTruthy();
    expect(screen.getByTestId('estimated-calories')).toBeTruthy();
  });

  it('shows AGE_TOO_YOUNG flag for user under 18', () => {
    renderWithProfile({ ...safeProfile, age: 16 });
    expect(screen.getByTestId('safety-flag-AGE_TOO_YOUNG')).toBeTruthy();
  });

  it('shows WEIGHT_LOSS_TOO_FAST flag for an aggressive 4-week target', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-flag-WEIGHT_LOSS_TOO_FAST')).toBeTruthy();
  });

  it('shows ambitious-but-allowed CTAs when goal is ambitious', () => {
    // 70 → 62 in 12 weeks = 0.667 kg/week → ambitious
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 62,
      targetTimeframe: { durationWeeks: 12 },
    });
    expect(screen.getByTestId('safety-cta-follow-klean')).toBeTruthy();
    expect(screen.getByTestId('safety-cta-continue-mine')).toBeTruthy();
  });

  it('shows unsafe CTAs (follow safer + edit) when goal is unsafe', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-cta-follow-klean')).toBeTruthy();
    expect(screen.getByTestId('safety-cta-edit-goal')).toBeTruthy();
    expect(screen.queryByTestId('safety-cta-continue-mine')).toBeNull();
  });

  it('shows inconsistent CTA when target weight contradicts goal', () => {
    renderWithProfile({
      ...safeProfile,
      goal: 'lose_weight',
      weightKg: 70,
      targetWeightKg: 80,
    });
    expect(screen.getByTestId('safety-cta-fix-goal')).toBeTruthy();
    expect(screen.queryByTestId('safety-cta-continue-mine')).toBeNull();
    expect(screen.queryByTestId('safety-cta-follow-klean')).toBeNull();
  });

  it('shows the GOAL_INCONSISTENT_GAIN flag when gain target is below current', () => {
    renderWithProfile({
      ...safeProfile,
      goal: 'gain_muscle',
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(screen.getByTestId('safety-flag-GOAL_INCONSISTENT_GAIN')).toBeTruthy();
  });

  it('does not classify 60→80 kg in 12 weeks as valid', () => {
    renderWithProfile({
      goal: 'gain_muscle',
      age: 28,
      gender: 'male',
      weightKg: 60,
      heightCm: 175,
      targetWeightKg: 80,
      trainingDaysPerWeek: 4,
      targetTimeframe: { durationWeeks: 12 },
    });
    expect(screen.queryByTestId('safety-all-good')).toBeNull();
    expect(screen.getByTestId('safety-flag-WEIGHT_GAIN_TOO_FAST')).toBeTruthy();
  });

  it('shows alternative suggestion when weight loss is unsafe', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-alternative')).toBeTruthy();
  });

  it('does not show alternative for age-blocked profiles', () => {
    renderWithProfile({ ...safeProfile, age: 15 });
    expect(screen.queryByTestId('safety-alternative')).toBeNull();
  });

  it('does not show alternative for valid profiles', () => {
    renderWithProfile(safeProfile);
    expect(screen.queryByTestId('safety-alternative')).toBeNull();
  });

  it('shows valid kind with 12-week default when no timeframe is set', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(screen.getByTestId('safety-all-good')).toBeTruthy();
  });

  it('blocks calories below floor — extreme short-term target is flagged unsafe', () => {
    renderWithProfile({
      age: 28,
      gender: 'female',
      weightKg: 70,
      heightCm: 168,
      targetWeightKg: 50,
      trainingDaysPerWeek: 3,
      goal: 'lose_weight',
      targetTimeframe: { durationWeeks: 4 },
    });
    const flag =
      screen.queryByTestId('safety-flag-WEIGHT_LOSS_TOO_FAST') ||
      screen.queryByTestId('safety-flag-CALORIES_TOO_LOW') ||
      screen.queryByTestId('safety-flag-DEFICIT_TOO_HIGH');
    expect(flag).toBeTruthy();
  });
});
