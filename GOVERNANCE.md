# Governance

## Contributor ladder

Russia.md is intentionally lightweight to contribute to and deliberately strict about source quality.

### Reader

- Reads, shares, and reports issues.
- Suggests topics, sources, and corrections.

### Contributor

- Opens focused pull requests for content, sourcing, UI, or tooling.
- Has at least one merged contribution.

### Reviewer

- Has a track record of accurate, reviewable contributions.
- Helps review pull requests for factual quality, source quality, or code safety.

### Maintainer

- Owns merge decisions.
- Resolves editorial or technical disputes when review is blocked.
- Keeps the repository buildable and the active corpus coherent.

## Decision rules

- Technical changes should prefer the smallest change that solves the problem cleanly.
- Content changes should prefer primary sources or clearly attributable secondary sources.
- For disputed claims, maintainers may request narrower wording, better sourcing, or a separate follow-up patch instead of merging broad assertions.
- Upstream `taiwan-md` changes are evaluated selectively. Fork provenance is preserved, but only changes that fit Russia.md's structure and goals should be merged.

## Repository areas

- `russia-knowledge/`: active content corpus
- `src/`: site shell, pages, and presentation logic
- `skills/` and `scripts/`: repo-local agent workflows, schemas, and validation tools
- `legacy-content/` and `legacy-pages/`: archived upstream material kept for provenance, not active development targets

## Review expectations

- Content reviews focus on factual accuracy, sourcing, scope discipline, and clarity.
- Code reviews focus on correctness, regressions, and maintainability.
- Large mixed PRs may be asked to split into separate content and technical changes.

## Maintainer

- `@denis-gordeev`
