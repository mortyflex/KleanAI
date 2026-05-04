import React, { createContext, useContext, useReducer } from 'react';
import type { OnboardingProfile } from '../../types/profile.types';

type PartialProfile = Partial<OnboardingProfile>;

interface OnboardingContextValue {
  profile: PartialProfile;
  updateProfile: (data: Partial<OnboardingProfile>) => void;
  resetProfile: () => void;
}

type Action =
  | { type: 'UPDATE'; payload: Partial<OnboardingProfile> }
  | { type: 'RESET' };

function reducer(state: PartialProfile, action: Action): PartialProfile {
  if (action.type === 'RESET') return {};
  return { ...state, ...action.payload };
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [profile, dispatch] = useReducer(reducer, {});

  const updateProfile = (data: Partial<OnboardingProfile>) =>
    dispatch({ type: 'UPDATE', payload: data });

  const resetProfile = () => dispatch({ type: 'RESET' });

  return (
    <OnboardingContext.Provider value={{ profile, updateProfile, resetProfile }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return ctx;
}
