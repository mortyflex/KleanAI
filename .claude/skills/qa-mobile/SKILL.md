---
name: qa-mobile
description: Use this skill whenever adding tests, reviewing quality, validating a phase, modifying business logic, adding UI flows, or preparing Klean AI code for commit.
---

# Klean AI QA Mobile Skill

## Goal

Ensure every Klean AI development phase includes adapted tests, quality checks, and a clean commit-ready state.

## Mandatory Rule

Every new feature, behavior, validation rule, reducer, utility, or important UI flow must include tests in the same phase.

Do not postpone tests to the end.

## What To Test

### UI Components

Add smoke tests for:

- reusable primitives
- important cards
- screens with key user actions

Check:

- component renders
- key text is visible
- main button/action exists
- disabled/loading states when relevant

### Business Logic

Add unit tests for:

- safety validation
- calorie calculations
- workout program generation
- smoothing engine
- offline queue
- nutrition event handling
- equipment/ingredient mapping
- subscription gating

### Forms

Add validation tests for:

- valid inputs
- invalid inputs
- dangerous goals
- missing required fields
- edge cases

### Offline Behavior

Add tests for:

- pending state
- queued actions
- retry behavior
- synced/failed state transitions

### i18n

Add tests for:

- i18n initialization
- translated component rendering
- no crash when switching language if supported

### External Services

Mock:

- Supabase
- Gemini
- RevenueCat
- Sentry
- analytics providers

Do not perform real external calls in tests.

## Commands To Run

Before finishing any development phase, run:

```bash
npm run typecheck
npm run lint
npm test
```
