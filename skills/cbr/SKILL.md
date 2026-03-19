---
name: cbr
description: Use this skill when a task needs official Central Bank of Russia reference data such as exchange rates, directories, or central-bank sourced metadata. Do not use it for executable trading prices, personalized financial advice, or non-official market data.
---

# CBR Skill

Use this skill for official central-bank reference data in finance workflows.

## Use This Skill For

- Official FX reference rates
- Finance reporting annotations
- Bank or payment metadata derived from CBR materials
- Back-office workflows that require official publication timestamps

## Workflow

1. Pull the latest available official CBR data.
2. Record publication date and retrieval time.
3. Distinguish reference values from executable prices.
4. Attach source metadata to any downstream calculation or report.

## Output Contract

```json
{
  "dataset": "fx|directory|reference",
  "published_at": "",
  "retrieved_at": "",
  "values": {},
  "advice_disclaimer": true
}
```

## Guardrails

- Never present CBR reference data as personalized financial advice.
- Always stamp the time basis of the data.
- Be explicit when a workflow still needs commercial or broker data.

## Official Entry Points

- [CBR developer resources](https://cbr.ru/development/)

## Bundled Resources

- See `references/integration-notes.md` for timestamping and finance-reporting notes.
- See `examples/output.json` for a minimal result shape.
