# Identity Chain Guide

Use this guide when a workflow spans low-friction consumer login, higher-trust verification, and regulated follow-up actions.

## Typical Chain

1. `vk-id`
2. `esia`
3. Internal approval or KYC review

## When To Use Each Skill

- Use `vk-id` for low-friction consumer authentication, signup, or account linking.
- Use `esia` when the workflow requires verified state-backed identity or an official public-service handoff.
- Do not jump straight to ESIA if the product only needs lightweight consumer login.

## Pattern

- Start with the lowest-friction identity that satisfies the current step.
- Escalate to ESIA only when the workflow truly requires verified state identity.
- Keep the handoff boundary explicit: the agent prepares and explains, the user completes the official flow.

## Output Expectations

- Identify the current trust level.
- State whether stronger identity is required for the next step.
- Describe what can be completed in-app and what must happen in the official channel.
