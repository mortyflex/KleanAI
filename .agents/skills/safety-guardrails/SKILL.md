---
name: safety-guardrails
description: Use this skill when implementing weight loss validation, calorie floor checks, risky user profiles, disclaimers, or health-related restrictions.
---

# Klean AI Safety Guardrails Skill

## Goal

Klean AI must be safe and responsible.

It must not generate dangerous training or nutrition plans.

## Automatic Blocking Rules

Block automatic plan generation when:

- user is under 18
- user reports pregnancy
- user reports eating disorder history
- user has very low BMI
- user reports a medical condition requiring professional supervision
- requested weight loss is more than 1% of body weight per week
- calorie target is below safety floor
- deficit is too aggressive
- training volume is excessive for the user level
- injury or pain makes the plan unsafe

## Required Behavior

When blocking:

- do not shame the user
- explain clearly and pedagogically
- suggest a safer alternative
- offer a 7-day Kickstart plan if appropriate
- recommend professional advice when needed

## Tone Example

“Je ne peux pas te générer un plan aussi agressif automatiquement. Pour rester safe, je te propose une alternative plus durable et un Kickstart de 7 jours pour lancer la dynamique sans mettre ton corps en difficulté.”

## Output Requirements

When implementing safety logic:

- list the rule triggered
- provide the user-facing message
- provide the safer alternative
- include tests for risky cases
