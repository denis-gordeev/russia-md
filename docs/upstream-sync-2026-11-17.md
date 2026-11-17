# Selective upstream sync — 2026-11-17

Reviewed `frank890417/taiwan-md` from the previous reviewed revision
`7b45bdf29c` through `14ee47ffcd` (191 reachable commits, 783 changed paths).

## Applied

Adapted the independent build/validation jobs from upstream commit
[`c10b8d5cf0`](https://github.com/frank890417/taiwan-md/commit/c10b8d5cf00e28ad756371c59c2304edc8af14c8).
The Pages workflow now runs the site build alongside all six existing source
validation steps. Deployment requires both jobs to succeed. Each job retains
full Git history, the repository Node baseline and the same dependency install.
The build still runs its rendered-page and internal-link checks through
`postbuild`. `CONTENT_DIFF_BASE` remains set on the content validation step.

## Excluded

- Taiwan articles, translations, election pages, sound recordings and datasets:
  the active corpus is `russia-knowledge/`.
- Semiont operational state, feedback, reports and editorial taxonomy decisions:
  these belong to the upstream project.
- Footnote-label repairs and curation-policy tools: these operate on upstream
  multilingual `knowledge/` content and are absent from the active fork.
- OG-image skipping, sparse checkout of UI gates and translation-history tuning:
  the corresponding generators, gates and language-sync tools are absent here.
- Manual Pages archive upload with lower compression: upstream measured this
  against a 6.1 GB archive; our local output is about 43 MB. Keep the existing
  Pages upload action until measurements justify replacing it.
- Upstream's accepted dependency-risk policy: this is a project-specific policy
  decision rather than a dependency fix.

This is a selective port; upstream history and archived Taiwan content are not
merged wholesale. No CI speedup is claimed until measured on GitHub Actions.

## Local validation

- Parsed workflow YAML and compared every original run command and step-level
  environment; only the independent job's dependency install is duplicated.
  Confirmed `deploy.needs` contains both `build` and `validate`.
- `npm run build`: 28 HTML pages; postbuild verified 517 internal links.
- `check:skills`, `check:skills:fixtures`, `check:git-paths`,
  `check:contributors` and the four Python rendered-link regression tests passed.
- `test:content:ci` passed with no changed content selected.
- Prettier and `git diff --check` passed for the changes.

GitHub Actions execution is verified separately after pushing this commit.
