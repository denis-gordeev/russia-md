---
name: banking
description: Use this skill when a task involves Russian banking APIs, treasury workflows, payment reconciliation, statements, payouts, or merchant operations with banks such as T-Bank, Sber, Alfa, or similar partners. Do not use it for public reference-rate lookups that belong to the CBR skill.
---

# Banking Skill

Use this skill for contract-backed bank integrations in Russian business workflows.

## Use This Skill For

- Payment reconciliation
- Statement matching against invoices or ERP data
- Merchant acquiring and payout workflows
- Treasury and operations tooling around bank APIs

## Workflow

1. Identify the bank product surface: statements, payments, payouts, acquiring, or merchant support.
2. Separate read operations from monetary writes.
3. Map operator approvals for every irreversible or money-moving action.
4. Keep sandbox and production credentials fully separate.
5. Return a structured reconciliation or execution plan instead of vague prose.

## Output Contract

```json
{
  "bank_surface": "statements|payments|payouts|acquiring|support",
  "requested_actions": [],
  "read_only_first": true,
  "requires_human_approval": true,
  "audit_log_required": true
}
```

## Guardrails

- All monetary writes require explicit confirmation.
- Never mix sandbox and production credentials.
- Use role-scoped service accounts or API keys where possible.
- Log before/after state for payment and payout operations.

## Typical Targets

- T-Bank business APIs
- Sber business APIs
- Alfa business APIs
- Other contract-backed acquiring or treasury integrations

## Bundled Resources

- See `references/integration-notes.md` for approval boundaries and reconciliation patterns.
- See `examples/output.json` for a minimal result shape.
