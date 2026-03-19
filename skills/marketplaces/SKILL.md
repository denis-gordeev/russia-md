---
name: marketplaces
description: Use this skill when a task involves Russian marketplace seller operations for platforms such as Ozon, Wildberries, or Yandex Market, including catalog updates, stock, pricing, order exceptions, or seller reporting. Do not use it for generic ecommerce advice without a marketplace API workflow in scope.
---

# Marketplaces Skill

Use this skill for seller-side marketplace operations across the main Russian platforms.

## Use This Skill For

- Catalog and listing operations
- Inventory and stockout monitoring
- Seller reporting and conversion analysis
- Order exception triage
- Repricing support inside policy boundaries

## Workflow

1. Identify the platform: Ozon, Wildberries, Yandex Market, or multi-channel.
2. Classify the task as `catalog`, `stock`, `pricing`, `orders`, `ads`, or `reporting`.
3. Prefer analysis and draft changes before live mutations.
4. Record platform-specific validation limits before any content or price update.
5. Log every listing mutation with before/after snapshots.

## Output Contract

```json
{
  "platform": "ozon|wildberries|yandex-market|multi",
  "surface": "catalog|stock|pricing|orders|ads|reporting",
  "suggested_actions": [],
  "requires_human_approval": true,
  "change_log_required": true
}
```

## Guardrails

- Do not auto-change prices without explicit policy bounds.
- Keep marketplace-specific constraints visible in the result.
- Prefer draft content improvements over silent live edits.
- Preserve snapshots of listing state before every mutation.

## Typical Targets

- Ozon seller APIs
- Wildberries seller APIs
- Yandex Market seller APIs

## Bundled Resources

- See `references/integration-notes.md` for mutation logging and policy boundaries.
- See `examples/output.json` for a minimal result shape.
