---
name: offline-first
description: Use this skill when implementing TanStack Query, offline caching, optimistic mutations, local persistence, gym-no-network behavior, or background synchronization.
---

# Klean AI Offline-First Skill

## Goal

Klean AI must work inside gyms with poor or no network.

The user must always be able to:

- open today’s workout
- check exercises
- mark a session as complete
- mark a session as missed
- view the current plan
- view basic nutrition guidance

## Rules

Use TanStack Query for:

- server state
- cached profile data
- cached workout plans
- cached workout sessions
- cached nutrition plans
- optimistic mutations

Use local persistence for:

- query cache
- pending workout logs
- pending nutrition events
- pending smoothing events
- failed sync attempts

## UX Requirements

When offline:

- never block the user from checking an exercise
- show a subtle offline indicator
- queue changes locally
- sync silently when the network returns
- avoid scary error messages

## Mutation Rules

For workout logging:

1. update UI immediately
2. write local pending event
3. attempt sync
4. mark as synced or retry later

For smoothing events:

1. record the user action immediately
2. show reassuring feedback
3. calculate locally if possible
4. sync to Supabase Edge Function later when online

## Output Requirements

When implementing offline logic, always provide:

- query keys
- mutation flow
- local queue behavior
- failure behavior
- sync retry strategy
