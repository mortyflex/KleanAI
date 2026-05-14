---
name: smoothing-engine
description: Use this skill when implementing missed workout handling, nutrition deviation handling, zero-guilt copy, 72h smoothing, or plan adjustment logic.
---

# Klean AI Smoothing Engine Skill

## Goal

The Smoothing Engine is the core product differentiator of Klean AI.

It helps users recover from real-life deviations without guilt:

- missed workout
- partial workout
- too much food
- skipped meal
- ordered food
- alcohol
- fatigue
- no available machine
- lack of time

## Tone

Always use zero-guilt copy.

Good:

- “Pas de stress, on ajuste.”
- “Ton plan est toujours sur les rails.”
- “Je t’ai préparé une option plus simple.”
- “On garde le cap sans compenser violemment.”

Bad:

- “Tu as échoué.”
- “Tu dois compenser.”
- “Tu n’as pas respecté ton plan.”
- “Il faut brûler ces calories.”

## Nutrition Smoothing Rules

If the user reports excess calories:

- never punish the user
- never cut calories aggressively the next day
- smooth the impact over 48h to 72h
- never go below the safety calorie floor
- prefer small adjustments and/or light activity suggestions

Example:
If excess is 500 kcal:

- reduce next 3 days by about 166 kcal if safe
- otherwise partially smooth and explain calmly

## Workout Smoothing Rules

If the user misses a workout:
Offer:

1. express workout
2. reschedule
3. integrate key exercises into next sessions

Never break the full program unless necessary.

## Output Requirements

When implementing smoothing:

- define event type
- define impact
- define adjustment
- define copy
- define safety checks
- define UI feedback
