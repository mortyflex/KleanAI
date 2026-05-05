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

##Onboarding Requirements

The onboarding must adapt the experience based on the user profile.

The onboarding must collect a target timeframe whenever the user has a measurable transformation goal.

Target timeframe can be:

- preset duration in weeks
- custom duration in weeks
- target event date or event label

For weight-related goals, the safety logic must combine:

- current weight
- target weight
- target timeframe
- requested weekly change

If the requested timeline is unsafe or unrealistic, the app must refuse automatic aggressive planning pedagogically and suggest:

- safer weekly target
- more realistic timeframe
- 7-day Kickstart
- partial progress before the event

---

## Safety Guardrails

Klean AI must never generate unsafe automatic fitness or nutrition plans.

The app must detect risky goals during onboarding and explain the issue pedagogically, without guilt or shame.

### Automatic blocking rules

Block automatic plan generation when:

- user is under 18
- pregnancy is reported
- eating disorder history is reported
- BMI is too low
- medical supervision is needed
- requested weight loss is more than 1% of current body weight per week
- requested calorie target is below the safety floor
- requested calorie deficit is too aggressive
- requested training volume is excessive for the user level
- injury, pain, or medical condition makes the plan unsafe

### Weight goal timeline safety

For every weight-related goal, safety validation must combine:

- current weight
- target weight
- target timeframe
- requested weekly weight change

For weight loss:

- calculate requested weekly loss from current weight, target weight, and timeframe
- block automatic planning if requested weekly loss is above 1% of current body weight
- block any plan requiring calories below the safety floor
- propose a safer alternative instead of silently accepting the goal

### Target timeframe requirement

The onboarding must collect a target timeframe whenever the user has a measurable transformation goal.

Target timeframe can be:

- preset duration in weeks
- custom duration in weeks
- target event date
- target event label such as wedding, vacation, competition, or other

If the requested timeline is unsafe or unrealistic, the app must refuse automatic aggressive planning pedagogically and suggest:

- safer weekly target
- more realistic timeframe
- 7-day Kickstart
- partial progress before the event if relevant

### User-facing tone

When blocking an unsafe goal:

- do not shame the user
- do not use guilt-based language
- explain the reason clearly
- suggest a safer path
- keep the user motivated

Good example:

“Ton objectif est compréhensible, mais le délai demandé forcerait un déficit trop agressif. Pour rester safe, je te propose une trajectoire plus réaliste, avec un Kickstart de 7 jours pour lancer la dynamique.”

Bad examples:

- “Objectif impossible.”
- “Tu ne peux pas faire ça.”
- “Ce n’est pas sérieux.”
- “Tu dois être plus raisonnable.”

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
