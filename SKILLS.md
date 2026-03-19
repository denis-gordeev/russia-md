# Skills for Russia-Focused LLM Agents

This document lists practical integration targets for LLM agents operating in the Russian market. It is written as an engineering brief rather than a marketing catalog: what the system is useful for, how access usually works, what an agent can do safely, and where the hard edges are.

The brief now has a repository-skill implementation under `skills/`, with Codex discovery exposed through `.agents/skills` as a symlink to that folder. Treat this file as the high-level overview and prioritization note; treat each `skills/*/SKILL.md` file as the executable skill entry.

## Design Principles

- Prefer official APIs and documented partner programs over scraping.
- Separate public-data skills from user-account skills.
- Treat Russian government and finance integrations as high-trust operations with explicit user approval.
- Build every skill with audit logs, idempotent actions, and human confirmation for irreversible steps.
- Assume some integrations require legal onboarding, production review, or whitelisting before real access is granted.

## Skill Format

For each integration, a reusable agent skill should define:

- Purpose: what business workflow it unlocks.
- Auth: how the agent obtains access.
- Read Actions: safe operations the agent can perform automatically.
- Write Actions: operations requiring confirmation.
- Guardrails: legal, security, and product constraints.
- Output Contract: the exact JSON or markdown shape returned to the calling agent.

## 1. Gosuslugi / ESIA Skill

### What it is

`Gosuslugi` is Russia's public services platform. For third-party systems, the relevant integration point is typically `ESIA`, the unified identification and authentication system used for sign-in and profile exchange across state-connected services.

### Best use cases

- Sign users in with a verified state identity.
- Pull user-consented profile attributes into regulated workflows.
- Route users into public-service journeys that must start from verified identity data.
- Support application flows where the agent prepares data, but the user completes the final action inside an official interface.

### Auth model

- Typically partner onboarding, not open self-serve developer signup.
- OAuth2-style identity flow is the common mental model, but deployment details are usually stricter than consumer OAuth.
- Real production access may require legal entity validation, registered redirect URIs, and state or contractor approval.

### Good agent tasks

- Prepare a prefilled application packet before redirecting the user.
- Explain what data the service will request and why.
- Check whether a workflow can continue with partial identity or requires verified ESIA authentication.
- Convert a user goal into the exact list of documents or fields needed before they enter the official flow.

### Avoid

- Storing excessive identity data.
- Attempting high-risk state actions without explicit user review.
- Assuming open public API access for every Gosuslugi feature.
- Building against scraped internal endpoints.

### Recommended output contract

```json
{
  "auth_required": true,
  "flow_stage": "precheck|redirect|post-auth",
  "required_fields": [],
  "missing_fields": [],
  "next_step": "",
  "official_entrypoint": ""
}
```

### Notes

- Treat this as a partner-gated integration first, not a plug-and-play public API.
- Most useful agent pattern: "prepare and explain", then hand off the final legally significant step to the official channel.
- Official entry points: [Gosuslugi](https://www.gosuslugi.ru/), [ESIA](https://esia.gosuslugi.ru/).

## 2. VK Skill

### What it is

`VK` is the core social platform. For agents, the relevant layers are:

- `VK API` for platform, community, content, messaging, and app data.
- `VK ID` for authentication and identity across apps and sites.

### Best use cases

- Community management agents.
- Content publishing and moderation assistants.
- Support agents routing through VK communities or messaging surfaces.
- Consumer app sign-in via VK ID.

### Auth model

- Application registration in VK developer tooling.
- OAuth-based tokens for user or community context.
- Separate product surface for `VK ID` business integration.

### Good agent tasks

- Draft and publish community posts after review.
- Summarize inbound comments and messages.
- Tag user intent and route to CRM.
- Generate moderation queues for operators.
- Use VK ID as an identity provider for low-friction sign-in.

### Avoid

- Autonomous posting without approval in sensitive brands.
- Direct moderation deletes or bans without policy thresholds.
- Over-requesting permissions if only read access is needed.

### Recommended output contract

```json
{
  "scope": "content|community|auth|support",
  "actor": "user|group|service",
  "requested_permissions": [],
  "suggested_actions": [],
  "requires_human_approval": true
}
```

### Useful doc entry points

- [VK API methods](https://dev.vk.com/ru/method)
- [VK ID for business](https://id.vk.com/about/business)
- [VK ID documentation entry](https://id.vk.com/about/business/go/docs/ru/vkid/latest/oauth-vk)

## 3. Yandex Skill

### What it is

`Yandex` is the broadest practical commercial API surface in the region for maps, geocoding, routing, search-adjacent utilities, cloud services, and some speech/AI products depending on account access.

### Best use cases

- Routing and logistics agents.
- Address normalization and map-based planning.
- Place lookup, delivery ETA estimation, and region-aware serviceability checks.
- Voice interfaces where Yandex SpeechKit is already part of the stack.

### Good agent tasks

- Normalize user-entered Russian addresses.
- Plan visit schedules across cities.
- Estimate drive-time or service windows.
- Validate whether an address is inside a service polygon.

### Guardrails

- Separate geocoding from business decisions; geocoders return candidates, not truth.
- Cache carefully because address data changes.
- Keep user location access explicit.

### Useful doc entry points

- [Yandex Maps JavaScript API](https://yandex.com/maps-api/docs/js-api/index.html)
- Yandex Cloud products should be documented per service before implementation.

## 4. DaData Skill

### What it is

`DaData` is one of the most useful practical data-enrichment APIs for Russian-language products. It is especially strong for suggestions and normalization of addresses, organizations, names, and emails.

### Best use cases

- Lead qualification.
- Address cleanup before delivery or KYC.
- Company lookup by `INN`, `OGRN`, or text query.
- Form-assist agents that reduce user typing.

### Good agent tasks

- Suggest the best structured organization record from free text.
- Normalize and score address quality.
- Pre-validate fields before the user submits a longer form.
- Enrich CRM records with canonical company details.

### Guardrails

- Treat suggestions as probabilistic.
- Do not silently overwrite user-entered legal data.
- Always preserve raw input next to normalized output.

### Useful doc entry points

- [DaData](https://dadata.ru/)

## 5. CBR Skill

### What it is

`CBR` is the Central Bank of Russia. Its public feeds are useful for agents that need reference rates, banking metadata, and some official financial directories.

### Best use cases

- FX conversion reference in finance workflows.
- Compliance-adjacent validation against official directories.
- Back-office reporting that needs official central-bank data.

### Good agent tasks

- Pull the latest available official exchange rates.
- Annotate finance reports with source timestamps.
- Reconcile banking metadata from official references.

### Guardrails

- Distinguish reference rates from executable prices.
- Always stamp the publication date and retrieval time.
- Do not present CBR data as personalized financial advice.

### Useful doc entry points

- [CBR developer resources](https://cbr.ru/development/)

## 6. FNS Skill

### What it is

`FNS` is the Federal Tax Service. Public datasets and verification services are useful for legal-entity checks, registration validation, and compliance workflows.

### Best use cases

- Company verification.
- Counterparty risk prechecks.
- Business onboarding flows for Russian legal entities and sole proprietors.

### Good agent tasks

- Verify that an `INN` or company name matches an existing entity.
- Build a structured counterparty dossier from public records.
- Flag missing registration data before contract generation.

### Guardrails

- Use only official or licensed sources.
- Mark stale vs fresh registry data.
- Never claim a business is safe purely from registration presence.

## 7. Banking Skills: T-Bank, Sber, Alfa, Others

### What they are

Major Russian banks expose different degrees of API access for business clients, fintech partners, payments, acquiring, statements, and identity-adjacent services. Coverage varies significantly by product and contract.

### Best use cases

- Payment confirmation agents.
- Treasury and reconciliation workflows.
- Invoice and payout operations.
- Merchant support copilots.

### Good agent tasks

- Match incoming payments to invoices.
- Generate payout files for operator review.
- Reconcile statement lines against ERP records.
- Detect failed payment patterns and open support cases.

### Guardrails

- All monetary writes require explicit confirmation.
- Separate sandbox from production credentials.
- Use role-based API keys per business unit.

## 8. Commerce Skills: Ozon, Wildberries, Yandex Market

### What they are

Marketplace APIs are core for seller assistants in Russia. They usually expose catalog, stock, pricing, order, ad, and reporting surfaces.

### Best use cases

- Seller copilot for catalog ops.
- Marketplace repricing support.
- Stock and order exception handling.
- Content generation for product cards.

### Good agent tasks

- Identify listings with poor conversion.
- Draft title and description improvements within marketplace constraints.
- Flag stockout risk and suggest transfer actions.
- Build daily seller summaries across channels.

### Guardrails

- Do not auto-change prices without policy bounds.
- Keep marketplace-specific validation rules in each skill.
- Log every listing mutation with before/after snapshots.

## 9. Telecom / Messaging Skills

### Candidates

- SMS gateways used locally for OTP and notifications.
- Email providers with Russian deliverability coverage.
- Official Telegram bots where Telegram is part of the customer workflow.

### Good agent tasks

- Send status notifications.
- Trigger one-time codes through the approved auth system.
- Escalate important workflow events to operators.

### Guardrails

- Never let the agent define its own OTP flow.
- All messaging must respect consent and regional privacy rules.

## 10. Document and Signature Skills

### Candidates

- Russian e-signature providers.
- Corporate EDI platforms.
- Internal document-flow systems used by enterprises and public-sector vendors.

### Best use cases

- Contract preparation.
- Signature collection orchestration.
- Procurement and invoice document routing.

### Agent pattern

- The agent prepares, validates, and routes.
- The human signs or approves in the certified environment.

## Cross-Cutting Patterns

### Identity skill chain

`VK ID` for low-friction consumer login, `ESIA` for verified government-linked identity, and internal KYC checks for regulated workflows.

### Company onboarding skill chain

`DaData` for suggestion and normalization, `FNS` for official entity verification, and a banking API for settlement setup.

### Logistics skill chain

`Yandex Maps` for route planning, marketplace APIs for order intake, and a CRM or ERP connector for dispatch.

## Security Requirements for Every Skill

- Encrypted secret storage only.
- Per-integration service accounts where possible.
- Structured audit log for every read of sensitive data.
- Mandatory user confirmation for any state-changing action involving money, identity, contracts, or government workflows.
- Redaction rules for passport, tax, banking, and address data.

## Suggested Repository Structure

```text
skills/
  esia/
    README.md
    schema.json
    examples/
  vk/
    README.md
    schema.json
    examples/
  vk-id/
    README.md
  yandex/
    README.md
  dadata/
    README.md
  cbr/
    README.md
  fns/
    README.md
```

## Priority Order for Implementation

If this repo is meant to be useful quickly, build in this order:

1. `VK`
2. `VK ID`
3. `DaData`
4. `Yandex`
5. `CBR`
6. `FNS`
7. `Gosuslugi / ESIA`

This order is deliberate: it starts with accessible commercial integrations, then moves toward higher-friction regulated and partner-only systems.

## Sources

- [Gosuslugi](https://www.gosuslugi.ru/)
- [ESIA](https://esia.gosuslugi.ru/)
- [VK API methods](https://dev.vk.com/ru/method)
- [VK ID for business](https://id.vk.com/about/business)
- [VK ID documentation](https://id.vk.com/about/business/go/docs/ru/vkid/latest/oauth-vk)
- [Yandex Maps JS API](https://yandex.com/maps-api/docs/js-api/index.html)
- [DaData](https://dadata.ru/)
- [CBR developer resources](https://cbr.ru/development/)
