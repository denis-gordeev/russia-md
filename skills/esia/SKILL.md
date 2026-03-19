---
name: esia
description: Use this skill when a task involves Gosuslugi or ESIA identity flows, verified Russian state identity, public-service onboarding, or user journeys that must hand off into official government interfaces. Do not use it for generic OAuth or for scraping undocumented state endpoints.
---

# ESIA Skill

Use this skill for Russia-specific government identity workflows built around Gosuslugi and ESIA.

## Use This Skill For

- Preparing a user for an ESIA login or consent flow
- Mapping a product workflow to verified state identity requirements
- Listing the minimum fields and documents needed before redirecting into an official service
- Designing a safe handoff from an agent into Gosuslugi or an ESIA-backed journey

## Do Not Use This Skill For

- Generic social login design
- Scraping or reverse engineering internal government endpoints
- Fully autonomous execution of legally significant state actions

## Workflow

1. Classify the task as `precheck`, `redirect`, or `post-auth`.
2. Identify which user attributes are actually required.
3. Separate agent-side preparation from official-channel completion.
4. Minimize retained identity data and avoid unnecessary copies.
5. Make the final user action explicit when the workflow becomes legally significant.

## Output Contract

Return a compact machine-readable summary like:

```json
{
  "auth_required": true,
  "flow_stage": "precheck|redirect|post-auth",
  "required_fields": [],
  "missing_fields": [],
  "next_step": "",
  "official_entrypoint": ""
}
```

## Guardrails

- Treat ESIA as partner-gated unless the exact public integration path is documented.
- Never assume broad public API access across Gosuslugi features.
- Require explicit user review before any state-changing action.
- Do not store more identity data than the workflow needs.
- Prefer “prepare and explain” over “complete on the user’s behalf.”

## Official Entry Points

- [Gosuslugi](https://www.gosuslugi.ru/)
- [ESIA](https://esia.gosuslugi.ru/)
