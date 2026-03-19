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
- Ship [`SKILLS.md`](./SKILLS.md) covering Gosuslugi, VK, Yandex, DaData, CBR, FNS, banks, and marketplace integrations for LLM agents

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
- [ ] Finish DNS propagation for `www.russia-md.ru` and enable HTTPS
- [ ] Add skills for telecom, document-signature, and marketplace ops beyond the first wave
- [ ] Add icons/assets for high-value skills in `agents/openai.yaml`
- [ ] Add scripts/templates for high-friction integration workflows
- [ ] Add cross-skill composition guides for identity, onboarding, and marketplace workflows
- [ ] Add richer schema coverage for nested objects and stricter cross-field validation
- [ ] Add a dedicated CI workflow for skill validation outside deploys
- [ ] Add Russia-specific charts, maps, and supporting datasets
- [ ] Expand each category beyond the single starter essay
- [ ] Add a stronger editorial policy and sourcing checklist

## Development

```bash
npm install
npm run check:skills
npm run build
```

## Key Paths

- `src/` site shell and Astro pages
- `russia-knowledge/` active source markdown used by category and article pages
- `skills/` repo-local agent skills, one integration per folder
- `.agents/skills` symlink target for Codex repository skill discovery
- `skills/shared/` cross-skill schema guidance and shared validation patterns
- `skills/*/agents/openai.yaml` UI metadata and invocation defaults for skills
- `skills/*/references/` per-skill implementation notes
- `skills/*/examples/` example payloads and output contracts
- `skills/*/schemas/` per-skill JSON schema definitions for output contracts
- `scripts/validate-skill-examples.mjs` local and CI validator for skill examples
- `legacy-content/` archived upstream content kept for reference
- `legacy-pages/` archived upstream routes kept out of the active build
- `public/llms.txt` AI-oriented project summary

## Notes

- The active deployment target is `https://russia-md.ru`
- The default GitHub Pages URL for the fork is `https://denis-gordeev.github.io/russia-md/`
- The site intentionally presents itself as `Russia.md`, but the repository remains a visible fork of `taiwan-md`
