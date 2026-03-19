# Marketplace Operations Chain Guide

Use this guide when a workflow combines seller analytics, listing changes, stock management, and payouts across marketplaces.

## Typical Chain

1. `marketplaces`
2. `yandex` when location or routing matters
3. `banking` when settlements or reconciliation matter

## When To Use Each Skill

- Use `marketplaces` for seller-side catalog, stock, pricing, order, and reporting surfaces.
- Use `yandex` when the workflow depends on geocoding, routing, or serviceability.
- Use `banking` for statement reconciliation, payout controls, and treasury follow-up.

## Pattern

- Analyze first, mutate second.
- Keep pricing and listing edits inside explicit policy thresholds.
- Use location logic only when it changes a real marketplace outcome.
- Keep settlement logic separate from listing operations, even when one operator handles both.

## Output Expectations

- State which marketplace surface is in scope.
- Record whether a live mutation is proposed or only a draft recommendation.
- Preserve auditability across listing changes and money-related follow-up.
