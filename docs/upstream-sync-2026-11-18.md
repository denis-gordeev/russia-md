# Selective upstream review — 2026-11-18

Reviewed `frank890417/taiwan-md` after `14ee47ffcd` through
`f60106af6d` (156 reachable commits, 812 changed paths).

No applicable fixes were found for Russia.md in this range. This commit records
the reviewed boundary for the next selective sync.

## Review and exclusions

- 724 paths under `knowledge/` contain Taiwan articles, translations and their
  indexes. Russia.md uses `russia-knowledge/` as its active corpus.
- The only executable-tool change is upstream commit
  [`7dd6d62da0`](https://github.com/frank890417/taiwan-md/commit/7dd6d62da0),
  which expands translation-failure output from 120 to 400 characters so the
  Babel dispatcher can recognize exhausted OpenRouter credits. Neither the
  translator nor its dispatcher exists in this fork.
- The remaining script change refreshes Taiwan's editorial quality baseline;
  it does not change validation logic.
- The three changed i18n modules update Taiwan article counts. Alias and redirect
  configuration changes also refer to Taiwan content and routes absent here.
- Generated APIs, related-article maps, dates, statistics and dashboard data
  describe the upstream corpus. In particular, this fork generates its own
  `src/data/content-dates.json` from the active Russia corpus.
- README and `public/llms.txt` changes only refresh upstream statistics.
  Russia.md retains its own project descriptions.
- Operational memory, feedback, usage ledgers, reports and harvesting notes
  belong to the upstream project.

No dependency manifests, GitHub workflows, Astro configuration, components or
page implementations changed in the reviewed upstream range. Upstream history
and archived Taiwan material are not merged wholesale.

## Local validation

- `npm run build`, including rendered-page checks and internal-link validation.
- `npm run check:skills`, including repository Markdown references.
- Prettier check for this review and `git diff --check`.

GitHub Actions execution is separate from these local checks.
