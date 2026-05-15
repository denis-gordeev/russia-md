# Contributors Maintenance

This repository resolves article contributor cards through two layers that must stay in sync:

| File                  | Purpose                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `.mailmap`            | Consolidates multiple git author identities into one canonical author |
| `.all-contributorsrc` | Maps the canonical author to a GitHub login and display name          |

`src/utils/contributors.ts` reads git history with mailmap-aware author fields, normalizes names with `contributorKey()`, then resolves contributor cards through `.all-contributorsrc`.

If either layer is missing, the site falls back to raw git author data. That can produce duplicate people or invalid GitHub profile links.

## Normal Flow

For most contributors, keep the workflow simple:

1. Merge the contribution.
2. Add the contributor through the all-contributors flow so `.all-contributorsrc` stays canonical.

## When `.mailmap` Is Needed

Add `.mailmap` entries only when the same person has committed under multiple names or emails.

Examples:

```text
Canonical Name <canonical@email> Commit Name <commit@email>
Canonical Name <canonical@email> <commit@email>
```

This is especially useful in this fork because upstream history and local fork history can carry different author identities for the same person.

## Verification

Run:

```bash
npm run check:contributors
```

The script scans the active corpus, compares canonical git authors against `.all-contributorsrc`, and warns about:

- missing contributor entries
- GitHub logins that are not URL-safe

The check is warning-only by design. It should help maintainers catch metadata drift before contributor cards degrade.

## Maintenance Rule

Fix contributor metadata in `.mailmap` and `.all-contributorsrc`, not by editing article files just to change attribution output.
