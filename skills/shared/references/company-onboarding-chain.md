# Company Onboarding Chain Guide

Use this guide when a workflow spans business record capture, official verification, and settlement setup.

## Typical Chain

1. `dadata`
2. `fns`
3. `banking`

## When To Use Each Skill

- Use `dadata` first for cleanup, suggestions, and normalization of names, addresses, and identifiers.
- Use `fns` second for official legal-entity verification.
- Use `banking` last for treasury, payment, acquiring, or settlement configuration.

## Pattern

- Preserve raw user-entered data.
- Normalize before you verify.
- Verify before you enable money movement.
- Require explicit operator approval for payout, settlement, or acquiring actions.

## Output Expectations

- Show which fields are normalized versus officially confirmed.
- Call out missing business identifiers before banking steps.
- Keep a hard line between enrichment and compliance approval.
