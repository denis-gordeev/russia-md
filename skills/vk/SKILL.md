---
name: vk
description: Use this skill when a task involves VK communities, VK content publishing, moderation, messaging, comment triage, or using VK developer APIs for social, support, or community workflows. Do not use it for VK ID-only authentication tasks.
---

# VK Skill

Use this skill for VK platform operations outside pure identity.

## Use This Skill For

- Community management workflows
- Drafting or publishing VK posts
- Comment and message triage
- Moderation queue design
- CRM routing from VK interactions

## Do Not Use This Skill For

- VK ID business login by itself
- Unreviewed autonomous posting for sensitive brands
- Permanent moderation actions without policy thresholds

## Workflow

1. Identify the actor context: `user`, `group`, or `service`.
2. Scope the task as `content`, `community`, or `support`.
3. Request the minimum token permissions needed.
4. Separate read operations from state-changing writes.
5. Require human approval for publish, delete, ban, or irreversible moderation actions.

## Output Contract

```json
{
  "scope": "content|community|support",
  "actor": "user|group|service",
  "requested_permissions": [],
  "suggested_actions": [],
  "requires_human_approval": true
}
```

## Guardrails

- Keep write permissions narrower than read permissions whenever possible.
- Log before/after payloads for any publish or moderation action.
- Do not delete or ban by default; escalate into an operator queue unless policy says otherwise.
- Treat brand-sensitive posting as approval-gated even when technically automatable.

## Official Entry Points

- [VK API methods](https://dev.vk.com/ru/method)
