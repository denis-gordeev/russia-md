# Russia.md

`Russia.md` is a Russia-focused fork of [frank890417/taiwan-md](https://github.com/frank890417/taiwan-md). It keeps the upstream category-first country-atlas structure, then rebuilds the active site around Russia-specific content, links, and agent-facing documentation.

Active fork:
- [denis-gordeev/russia-md](https://github.com/denis-gordeev/russia-md)

Original upstream:
- [frank890417/taiwan-md](https://github.com/frank890417/taiwan-md)

## Scope

- Preserve the useful 12-category information architecture from `taiwan-md`
- Rebrand the active site as `Russia.md` while explicitly keeping fork lineage visible
- Replace active Taiwan-specific content with a clean Russia starter corpus under `russia-knowledge/`
- Keep archived upstream material under `legacy-content/` and `legacy-pages/` instead of deleting provenance
- Ship repo-local skill bundles under `skills/` covering Gosuslugi, VK, Yandex, DaData, CBR, FNS, banking, telecom, document-signature, and marketplace integrations for LLM agents

## Status

This is still a foundation fork, not a finished editorial product. The active site now builds from the Russia corpus and deploys through GitHub Pages for the forked repository.

## Progress Plan

- [x] Fork upstream `taiwan-md` and preserve its structure as the base
- [x] Replace the active content source with `russia-knowledge/`
- [x] Remove active Taiwan-specific pages and move upstream leftovers into `legacy-*`
- [x] Create starter Russia articles across 12 categories
- [x] Add `SKILLS.md` for Russia-oriented agent integrations
- [x] Create and push the active fork to `denis-gordeev/russia-md`
- [x] Enable GitHub Pages for the fork and deploy the current site
- [x] Connect the custom domain `russia-md.ru` in GitHub Pages
- [x] Restore visible attribution that this project is a fork of `taiwan-md`
- [x] Replace placeholder GitHub links on the site with the real fork URL
- [x] Split the monolithic `SKILLS.md` brief into repository skill folders
- [x] Add first-wave repo-local skills for ESIA, VK, VK ID, DaData, Yandex, CBR, and FNS
- [x] Add `agents/openai.yaml` metadata for repo-local skills
- [x] Add second-wave skills for banking and marketplaces
- [x] Add references and example payloads for each current skill
- [x] Add shared schemas and per-skill output schemas for current skills
- [x] Add automatic validation for example payloads against skill schemas
- [x] Run skill validation in the GitHub Pages build workflow
- [x] Add a dedicated CI workflow for skill validation outside deploys
- [x] Add cross-skill composition guides for identity, onboarding, and marketplace workflows
- [ ] Finish DNS propagation for `www.russia-md.ru` and enable HTTPS
- [x] Add skills for telecom, document-signature, and marketplace ops beyond the first wave
- [ ] Add icons/assets for high-value skills in `agents/openai.yaml`
- [ ] Add scripts/templates for high-friction integration workflows
- [ ] Add richer schema coverage for nested objects and stricter cross-field validation
- [ ] Add pull-request checks for content quality and editorial consistency
- [ ] Add machine-readable composition manifests for multi-skill orchestration
- [ ] Add scenario templates for OTP recovery, signature packets, and marketplace incident response
- [x] Add validation that every skill ships metadata, references, schemas, and examples together
- [x] Update GitHub Actions dependencies for Node 24 compatibility before the June 2026 runner switch
- [ ] Add higher-level operator playbooks that connect skills to site content and category pages
- [ ] Add Russia-specific charts, maps, and supporting datasets
- [ ] Expand each category beyond the single starter essay
- [ ] Add a stronger editorial policy and sourcing checklist
- [x] Add schema-level validation for `agents/openai.yaml` metadata fields and allowed UI keys
- [ ] Add scenario template bundles under skills for ready-to-run operator handoffs
- [x] Add CI checks for broken local links inside `README.md`, `SKILL.md`, and docs pages
- [x] Add schema fixtures and negative tests for invalid skill bundles to harden the validator
- [x] Add incremental `check:skills` support for changed skill folders to speed up local iteration
- [x] Add linting for referenced asset paths in `agents/openai.yaml` before icons land
- [x] Add anchor-aware link validation for local markdown references with `#fragment` checks
- [x] Add support for validating shared schemas and validator inputs separately from changed skill folders in `check:skills:changed`
- [ ] Add first local icon asset set and wire it into `agents/openai.yaml`
- [x] Add negative tests for broken markdown anchors and invalid metadata/icon paths
- [x] Add front-matter-aware markdown validation for docs and skill references
- [x] Add fixture coverage for missing bundle files and shared-schema regression cases
- [x] Run `check:skills:changed` in CI for pull requests alongside the full validation pass
- [ ] Add diff-aware markdown validation that can re-check inbound links when shared docs or anchors change
- [ ] Add fixture coverage for malformed front matter and invalid markdown link syntax edge cases
- [x] Teach the validator to report all markdown-link failures in one pass instead of failing on the first error
- [x] Add line-aware markdown diagnostics so broken links report the source line number
- [x] Extend incremental validation to repository docs outside `skills/` when only shared references or `README.md` change
- [x] Add pull-request workflow split so PRs run `check:skills:changed` before the full fixture suite
- [ ] Add nearest-anchor suggestions for broken markdown fragment diagnostics
- [ ] Add a small validator unit for line-number handling in front-matter-heavy markdown files
- [ ] Reuse installed dependencies across skill-validation jobs to cut repeated `npm install` work in CI
- [x] Add a dedicated validator flag for staged-path or explicit-path validation outside git-status heuristics
- [x] Add repository community-health docs and contribution templates for issues, PRs, conduct, governance, and security
- [x] Scope repository markdown validation to explicit `--paths` / `--staged` inputs when only selected docs changed
- [ ] Add automated dependency update policy for validator and site tooling
- [ ] Add contributor-facing docs for how CODEOWNERS, issue forms, and review lanes map to content vs tooling changes
- [ ] Add diff-aware inbound doc rechecks when moved or deleted local assets can break unchanged markdown files
- [ ] Add clearer no-op validator output for path-scoped runs with no skill or markdown targets

## Development

```bash
npm install
npm run check:skills
npm run check:skills:changed
npm run check:skills:staged
npm run check:skills:fixtures
npm run build
```

`npm run check:skills` now validates that every repo-local skill ships its core bundle together: `SKILL.md`, `agents/openai.yaml`, `references/integration-notes.md`, `examples/output.json`, and `schemas/output.schema.json`. It also validates `agents/openai.yaml` against a shared metadata schema, rejects unknown UI keys, checks that each default prompt explicitly mentions the matching `$skill-name`, verifies local markdown links across `README.md`, `skills/**/SKILL.md`, and docs/reference pages, ignores YAML front matter while scanning markdown bodies, validates local markdown `#fragment` anchors against headings and explicit `id=""` anchors, reports broken markdown references with source line numbers, and lints local `interface.icon` asset paths when icons are present.

`npm run check:skills:changed` validates only skill folders currently changed in git status, but automatically falls back to validating all skills when shared schema inputs or validator wiring change. When the change set only touches repository docs such as `README.md`, `docs/**`, or `skills/shared/references/**`, it now scopes markdown-link checks to those changed markdown files instead of re-scanning every tracked doc. Pull requests now run this incremental pass first in CI before the full validation and fixture jobs, while pushes to `main` continue running the full suite directly.

`npm run check:skills:staged` applies the same incremental logic to the staged git index, which is useful before commits. For ad hoc path-scoped runs outside git-status heuristics, use `npm run check:skills -- --paths README.md,skills/esia/SKILL.md`; path-scoped runs now validate only the selected repo docs plus any directly targeted skill folders.

`npm run check:skills:fixtures` runs a small fixture suite for the validator itself, including front-matter-aware markdown regression coverage plus negative cases for broken markdown anchors, aggregated markdown-link failures with line-aware diagnostics, missing shared metadata schema files, and invalid `interface.icon` metadata.

## Key Paths

- `src/` site shell and Astro pages
- `russia-knowledge/` active source markdown used by category and article pages
- `skills/` repo-local agent skills, one integration per folder
- `.agents/skills` symlink target for Codex repository skill discovery
- `skills/shared/` cross-skill schema guidance and shared validation patterns
- `skills/shared/schemas/agent-metadata.schema.json` shared schema for `skills/*/agents/openai.yaml`
- `skills/shared/references/` composition guides spanning multiple skills
- `skills/*/agents/openai.yaml` UI metadata and invocation defaults for skills
- `skills/*/references/` per-skill implementation notes
- `skills/*/examples/` example payloads and output contracts
- `skills/*/schemas/` per-skill JSON schema definitions for output contracts
- `scripts/validate-skill-examples.mjs` local and CI validator for skill bundle completeness, metadata schema checks, markdown-link and anchor validation, optional icon asset path linting, and changed-skill filtering
- `scripts/test-validate-skill-examples.mjs` validator fixture runner covering valid and negative bundle cases
- `scripts/fixtures/skill-validator/` minimal fixture repositories for validator regression checks
- GitHub Actions skill validation and deploy workflows now run on Node 24
- `.github/workflows/skills.yml` standalone CI workflow for incremental PR validation plus full skill and fixture validation
- `.github/CODEOWNERS`, issue templates, and `pull_request_template.md` define review routing and contribution intake
- `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, and `SECURITY.md` document repository participation and disclosure rules
- `skills/telecom/`, `skills/document-signature/`, and `skills/marketplace-ops/` third-wave operational skills
- `legacy-content/` archived upstream content kept for reference
- `legacy-pages/` archived upstream routes kept out of the active build
- `public/llms.txt` AI-oriented project summary

## Notes

- The active deployment target is `https://russia-md.ru`
- The default GitHub Pages URL for the fork is `https://denis-gordeev.github.io/russia-md/`
- The site intentionally presents itself as `Russia.md`, but the repository remains a visible fork of `taiwan-md`
