# AGENTS.md

This project is an Expo React Native mobile app.

Agents working on this project should follow the Expo documentation and use Expo-compatible libraries and workflows.

## Primary Instructions

Read `CLAUDE.md` before making changes.

## Expo Guidelines

- Use Expo Router for navigation.
- Use `npx expo install` for Expo-managed packages.
- Do not create or modify native `ios` or `android` folders unless explicitly requested.
- Do not use libraries that require custom native code unless they are compatible with Expo development builds.
- Keep the project compatible with Expo SDK 55.
- Prefer stable, documented Expo APIs.

## Design Guidelines

The UI must follow the KleanAI premium dark fitness design direction.

Avoid:

- Generic starter UI
- Plain white backgrounds
- Unstyled default components
- Random colors
- Inconsistent spacing

Prefer:

- Dark backgrounds
- Strong typography
- Card-based layouts
- Premium mobile UI
- Fitness-focused visual hierarchy
- Reusable components

## Development Workflow

Before changing files:

1. Inspect the current file structure.
2. Identify the relevant files.
3. Make minimal focused changes.
4. Keep the app runnable.
5. Suggest the next test command.

## Testing

## Testing policy

Every feature must include adapted tests in the same phase.

Before finishing any task, run:

- npm run typecheck
- npm run lint
- npm test

Use the qa-mobile skill for phase validation, test planning, and commit readiness.

After significant changes, suggest:

```bash
npx expo start --clear
```
