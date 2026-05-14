---
name: ai-vision
description: Use this skill when implementing Gemini vision, gym machine recognition, fridge image analysis, AI prompt schemas, AI logs, or AI provider abstraction.
---

# Klean AI Vision Skill

## Goal

Use AI vision to support the product, not replace the product logic.

AI should classify and extract structured information.
It must not freely invent workout programs or nutrition plans.

## Gym Vision

The user uploads several photos of machines they want to include.

AI should return structured JSON:

- detected equipment
- confidence
- possible aliases
- visible constraints
- suggested internal equipment mapping

Then the user confirms or corrects the result.

## Fridge Vision

The user uploads a fridge or pantry photo.

AI should return structured JSON:

- detected ingredients
- estimated confidence
- category
- quantity estimate if visible
- uncertainty notes

Then the user confirms or corrects the result.

## Rules

- Always use strict JSON schemas.
- Always validate AI output.
- Always map AI output to internal database entities.
- Never trust AI output blindly.
- Always log prompt version, model, latency, and output summary.
- Do not store sensitive image details unnecessarily.

## Output Requirements

When implementing AI vision:

- create or update the AI provider abstraction
- define JSON schema
- define validation
- define user confirmation step
- define logs
- define fallback behavior
