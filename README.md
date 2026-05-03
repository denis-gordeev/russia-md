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
- [x] Add fixture coverage for malformed front matter and invalid markdown link syntax edge cases
- [x] Teach the validator to report all markdown-link failures in one pass instead of failing on the first error
- [x] Add line-aware markdown diagnostics so broken links report the source line number
- [x] Extend incremental validation to repository docs outside `skills/` when only shared references or `README.md` change
- [x] Add pull-request workflow split so PRs run `check:skills:changed` before the full fixture suite
- [x] Add nearest-anchor suggestions for broken markdown fragment diagnostics
- [ ] Add a small validator unit for line-number handling in front-matter-heavy markdown files
- [x] Reuse installed dependencies across skill-validation jobs to cut repeated `npm install` work in CI
- [x] Add a dedicated validator flag for staged-path or explicit-path validation outside git-status heuristics
- [x] Add repository community-health docs and contribution templates for issues, PRs, conduct, governance, and security
- [x] Scope repository markdown validation to explicit `--paths` / `--staged` inputs when only selected docs changed
- [ ] Add automated dependency update policy for validator and site tooling
- [ ] Add contributor-facing docs for how CODEOWNERS, issue forms, and review lanes map to content vs tooling changes
- [ ] Add diff-aware inbound doc rechecks when moved or deleted local assets can break unchanged markdown files
- [x] Add clearer no-op validator output for path-scoped runs with no skill or markdown targets
- [x] Add path-scoped validator diagnostics that distinguish unmatched paths from ignored non-markdown files
- [x] Add fixture coverage for staged and changed no-op validator runs outside `--paths`
- [x] Add directory-aware `--paths` expansion for repo docs and shared references
- [x] Add capped/truncated `--paths` diagnostics for large ignored or unmatched path sets
- [x] Add directory-aware `--paths` expansion for direct skill-folder selections
- [x] Add fixture coverage for mixed directory-scoped `--paths` selections that combine tracked docs with ignored paths
- [ ] Add capped/truncated anchor-suggestion output when headings generate many similar slugs
- [x] Add fixture coverage for anchor-suggestion fallbacks when no close heading exists
- [x] Add fixture coverage for direct skill-folder `--paths` selections and nested subpaths
- [x] Add capped/truncated diagnostics when a markdown validation run surfaces many broken links at once
- [x] Add validator diagnostics for malformed YAML in `agents/openai.yaml` with file-local context, similar to markdown front matter errors
- [ ] Add fixture coverage for truncated `--paths` diagnostics when ignored markdown and unmatched inputs are mixed in one run
- [ ] Add fallback fixture coverage for malformed `agents/openai.yaml` cases that do not report parser line/column data
- [x] Add aggregated diagnostics truncation when many markdown failures occur across both skill docs and repo docs in one run
- [ ] Skip full fixture runs on PRs that only touch editorial docs outside validator-owned paths
- [ ] Add a shared composite GitHub Action or reusable workflow for Node setup + cached install across validation jobs
- [ ] Make markdown-error truncation configurable for local debugging while keeping CI output capped by default
- [ ] Group repeated markdown validation failures by source file before applying global truncation
- [ ] Add fixture coverage for truncated markdown diagnostics during path-scoped `--paths` runs

## Development

```bash
nvm use
npm install
npm run check:skills
npm run check:skills:changed
npm run check:skills:staged
npm run check:skills:fixtures
npm run build
```

The repo now includes `.nvmrc` pinned to Node 24 so local shells match the CI/runtime baseline used by the GitHub Actions workflows.

`npm run check:skills` now validates that every repo-local skill ships its core bundle together: `SKILL.md`, `agents/openai.yaml`, `references/integration-notes.md`, `examples/output.json`, and `schemas/output.schema.json`. It also validates `agents/openai.yaml` against a shared metadata schema, rejects unknown UI keys, checks that each default prompt explicitly mentions the matching `$skill-name`, verifies local markdown links across `README.md`, `skills/**/SKILL.md`, and docs/reference pages, ignores YAML front matter while scanning markdown bodies, validates local markdown `#fragment` anchors against headings and explicit `id=""` anchors, reports broken markdown references with source line numbers, suggests the nearest matching anchor when a markdown fragment misses by a small typo, and lints local `interface.icon` asset paths when icons are present.

`npm run check:skills:changed` validates only skill folders currently changed in git status, but automatically falls back to validating all skills when shared schema inputs or validator wiring change. When the change set only touches repository docs such as `README.md`, `docs/**`, or `skills/shared/references/**`, it now scopes markdown-link checks to those changed markdown files instead of re-scanning every tracked doc. Pull requests now run this incremental pass first in CI before the full validation and fixture jobs, and the validation workflow now cancels superseded in-flight runs for the same PR or ref.

`npm run check:skills:staged` applies the same incremental logic to the staged git index, which is useful before commits. For ad hoc path-scoped runs outside git-status heuristics, use `npm run check:skills -- --paths README.md,skills/esia/SKILL.md`; path-scoped runs now validate only the selected repo docs plus any directly targeted skill folders, can expand tracked markdown directories such as `docs` and `skills/shared/references`, return an explicit no-op message when the selected paths do not match any skill bundle or tracked markdown document, explain whether a `--paths` miss came from an unmatched path or an existing file that was ignored because it is outside the validator scope, and truncate long ignored/unmatched path lists so diagnostics stay readable.

`npm run check:skills:fixtures` runs a small fixture suite for the validator itself, including front-matter-aware markdown regression coverage plus negative cases for broken markdown anchors with nearest-anchor suggestions and no-suggestion fallbacks, malformed YAML front matter, malformed `agents/openai.yaml` files with file-local line/column diagnostics, malformed markdown-link syntax that should be ignored safely, aggregated markdown-link failures with line-aware diagnostics, capped/truncated markdown error output when one run surfaces many broken links, missing shared metadata schema files, invalid `interface.icon` metadata, path-scoped no-op output when `--paths` selects only ignored or unmatched files, no-op coverage for `--changed` and `--staged` runs that touch only out-of-scope files, truncated diagnostics for large ignored/unmatched `--paths` selections, and directory-scoped `--paths` coverage for tracked repository markdown trees as well as direct skill-folder selections.

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
- `scripts/validate-skill-examples.mjs` local and CI validator for skill bundle completeness, metadata schema checks, markdown-link and anchor validation with nearest-match suggestions, capped aggregate markdown diagnostics, optional icon asset path linting, changed-skill filtering, and directory-aware `--paths` expansion for tracked markdown trees
- `scripts/test-validate-skill-examples.mjs` validator fixture runner covering valid and negative bundle cases, including anchor-suggestion and no-suggestion fallbacks, malformed-agent-metadata diagnostics, aggregate-error truncation, and directory-scoped `--paths` regressions
- `scripts/fixtures/skill-validator/` minimal fixture repositories for validator regression checks
- GitHub Actions skill validation and deploy workflows now run on Node 24 with `npm ci` and built-in npm dependency caching
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
