---
name: dadata
description: Use this skill when a task involves Russian-language data enrichment or normalization through DaData, especially addresses, companies, names, emails, or form suggestion flows. Do not use it when registry verification must come only from official state sources like FNS.
---

# DaData Skill

Use this skill for high-leverage normalization and suggestion workflows in Russian-language products.

## Use This Skill For

- Address suggestions and cleanup
- Company lookup by free text, INN, or OGRN
- Form autofill and CRM enrichment
- Probabilistic normalization before downstream validation

## Workflow

1. Preserve raw user input.
2. Request suggestions or normalized candidates from DaData.
3. Score confidence and ambiguity.
4. Present the canonicalized result without hiding the original value.
5. Escalate to official verification if the workflow is legal or compliance-sensitive.

## Output Contract

```json
{
  "input_type": "address|company|person|email",
  "raw_input": "",
  "normalized_value": "",
  "confidence": 0.0,
  "alternatives": [],
  "needs_official_verification": false
}
```

## Guardrails

- Treat suggestions as probabilistic, not authoritative.
- Never silently overwrite legal fields in a final record.
- Pair with FNS or another official source when the decision is compliance-sensitive.

## Official Entry Points

- [DaData](https://dadata.ru/)
