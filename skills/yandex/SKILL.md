---
name: yandex
description: Use this skill when a task involves Yandex APIs for maps, geocoding, routing, address interpretation, delivery planning, or region-aware serviceability checks in Russia. Do not use it for generic cloud architecture without a specific Yandex service in scope.
---

# Yandex Skill

Use this skill for location-heavy workflows built on Yandex APIs.

## Use This Skill For

- Geocoding and reverse geocoding
- Routing and ETA estimation
- Service-area checks
- Address normalization tied to logistics or dispatch

## Workflow

1. Separate free-form address parsing from downstream business decisions.
2. Resolve the best candidate location and keep alternates when confidence is not high.
3. Compute route or serviceability using the resolved candidate.
4. Mark any business-critical assumptions clearly.
5. Keep user location consent explicit.

## Output Contract

```json
{
  "task_type": "geocode|route|serviceability|planning",
  "input": "",
  "resolved_location": null,
  "alternatives": [],
  "confidence": 0.0,
  "business_warning": ""
}
```

## Guardrails

- Geocoder output is a candidate, not ground truth.
- Cache location results carefully because address reality changes.
- Do not use inferred user location without an explicit user signal.

## Official Entry Points

- [Yandex Maps JavaScript API](https://yandex.com/maps-api/docs/js-api/index.html)

## Bundled Resources

- See `references/integration-notes.md` for routing and geocoding cautions.
- See `examples/output.json` for a minimal result shape.
