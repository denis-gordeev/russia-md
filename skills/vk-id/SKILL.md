---
name: vk-id
description: Use this skill when a task involves VK ID as an authentication or identity-provider layer for a site or app, including login design, token scopes, consent surfaces, and account-linking flows. Do not use it for general VK community or content-management work.
---

# VK ID Skill

Use this skill for low-friction authentication and identity workflows built on VK ID.

## Use This Skill For

- Designing sign-in with VK ID
- Mapping scopes and consent requirements
- Planning account linking between VK ID and an internal user model
- Separating public login from higher-trust KYC or ESIA steps

## Workflow

1. Define the identity goal: login, signup, relinking, or recovery.
2. Request only the scopes needed for that goal.
3. Decide what can happen pre-auth, post-auth, and after explicit user confirmation.
4. Keep profile ingestion narrow and reversible.
5. Document fallback paths when a user declines extra scopes.

## Output Contract

```json
{
  "identity_goal": "login|signup|link|recovery",
  "requested_scopes": [],
  "required_after_auth": [],
  "account_linking_strategy": "",
  "requires_human_approval": false
}
```

## Guardrails

- Do not collapse authentication and KYC into one implied step.
- Preserve a path for minimal sign-in when the product does not truly need extra attributes.
- Do not silently merge accounts without strong matching rules or explicit user confirmation.

## Official Entry Points

- [VK ID for business](https://id.vk.com/about/business)
- [VK ID documentation](https://id.vk.com/about/business/go/docs/ru/vkid/latest/oauth-vk)
