# CLAUDE.md — Klean AI

## Project Overview

Klean AI is a React Native Expo mobile app for fitness transformation, training, simple nutrition, and zero-guilt plan adaptation.

The app helps users follow a complete day-by-day fitness and nutrition plan while adapting to real life:

- missed workouts
- lack of time
- unavailable gym machines
- poor gym network
- food deviations
- fridge constraints
- dietary restrictions
- dangerous goals
- motivation drops

Core product promise:

> Klean AI adjusts your fitness and nutrition plan when real life gets messy, without guilt.

Klean AI is not a generic fitness tracker.
Klean AI is a friendly expert coach: motivating, practical, adaptive, and never judgmental.

---

## Product Positioning

Klean AI is a “pote de salle expert”:

- expert but friendly
- motivating but not aggressive
- structured but not rigid
- clear but not clinical
- supportive but not infantilizing

The app should make the user feel:

- guided
- safe
- motivated
- understood
- back on track even after deviations

The main differentiator is the Smoothing Engine, not AI vision alone.

AI vision is useful, but the core product is:

- automatic adaptation
- zero guilt
- no mental load

---

## Target Users

The app serves multiple profiles:

- beginners
- intermediate users
- people returning to fitness
- users training at home
- users training in gyms
- users in Basic-Fit
- users in Fitness Park
- users in ON AIR
- users trying to lose weight
- users trying to gain muscle
- users trying to maintain weight
- users seeking recomposition

The onboarding must adapt the experience based on the user profile.

---

## Tech Stack

Frontend:

- React Native
- Expo
- Expo Router
- TypeScript strict
- NativeWind
- React Hook Form
- Zod
- TanStack Query

Backend:

- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Edge Functions

AI:

- AI provider abstraction
- Gemini planned for Gym Vision and Fridge Vision
- strict JSON output
- validated AI responses
- prompt versioning
- AI logs

Business:

- RevenueCat
- 3-day trial
- monthly subscription
- annual subscription
- limited free AI scans if needed

Observability:

- Sentry
- PostHog or Amplitude
- AI logs
- Edge Function logs

Build:

- EAS Build
- iOS config
- Android config

---

## Repository Architecture

Use this structure:

```txt
/app
  _layout.tsx
  index.tsx

  /(auth)
  /(onboarding)
  /(tabs)
  /workout
  /vision

/src
  /components
    /ui
    /layout
    /feedback
    /charts

  /features
    /auth
    /onboarding
    /profile
    /goals
    /workout
    /nutrition
    /smoothing
    /vision
    /subscription
    /progress
    /safety
    /analytics

  /lib
    supabase.ts
    query-client.ts
    revenuecat.ts
    sentry.ts
    analytics.ts
    ai.ts

  /services
    ai.service.ts
    workout.service.ts
    nutrition.service.ts
    smoothing.service.ts
    subscription.service.ts
    analytics.service.ts

  /types
    database.types.ts
    profile.types.ts
    goal.types.ts
    workout.types.ts
    nutrition.types.ts
    smoothing.types.ts
    ai.types.ts

  /utils
    calories.ts
    dates.ts
    safety.ts
    formatting.ts
    validation.ts

/supabase
  /functions
    generate-program
    smooth-metabolism
    analyze-gym-images
    analyze-fridge-images
    revenuecat-webhook

/.claude
  /skills
```

## Mandatory Testing Policy

Every new feature must include adapted tests in the same development phase.

Do not postpone tests to the end of the project.

When creating or modifying functionality, always add or update tests for:

- new utilities
- reducers
- validation rules
- business logic
- important UI flows
- critical components
- error handling
- offline behavior when relevant
- i18n behavior when relevant

Testing rules:

- Do not only rely on snapshots.
- Prefer meaningful unit tests for business logic.
- Add smoke tests for screens and reusable components when practical.
- Mock external services such as Supabase, Gemini, RevenueCat, Sentry, and analytics providers.
- Do not integration-test external services unless explicitly requested and configured.
- Existing tests must continue to pass.
- If a new behavior is not tested, explain why.

Before finishing any development phase, always run:

- npm run typecheck
- npm run lint
- npm test

For UI phases, also run or document:

- npx expo start

Every phase report must include:

- TypeScript result
- lint result
- test result
- tests added or updated
- untested behavior, if any
