---
name: fns
description: Use this skill when a task involves Russian legal-entity verification, INN checks, counterparty prechecks, or company registration validation through official tax-service data. Do not use it for probabilistic company enrichment when DaData is the better first pass.
---

# FNS Skill

Use this skill for official entity verification and registration-aware checks.

## Use This Skill For

- INN-based company validation
- Counterparty prechecks
- Structured legal-entity dossiers from official registry data
- Business onboarding flows that require official registration confirmation

## Workflow

1. Normalize the business identifier or company name.
2. Query the official verification path.
3. Distinguish confirmed registry data from inferred or enriched metadata.
4. Mark freshness and any missing fields.
5. Avoid collapsing “registered” into “safe.”

## Output Contract

```json
{
  "query_type": "inn|company_name|ogrn",
  "official_match": true,
  "entity_status": "",
  "freshness_note": "",
  "risk_note": ""
}
```

## Guardrails

- Use official or licensed sources only.
- Always distinguish stale and fresh registry information.
- Never claim business safety purely from registry presence.

## Official Entry Points

- [Federal Tax Service](https://www.nalog.gov.ru/)
