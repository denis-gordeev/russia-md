#!/bin/sh

set -eu

staged_files="$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)"

if [ -z "$staged_files" ]; then
  exit 0
fi

cred_fail=0

for file in $staged_files; do
  [ -f "$file" ] || continue

  case "$file" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.pdf|*.zip|*.woff|*.woff2|*.ttf|*.otf|*.ico|*.mp4|*.mp3)
      continue
      ;;
  esac

  if grep -l '"type":[[:space:]]*"service_account"' "$file" >/dev/null 2>&1; then
    echo "Secret scan failed: $file looks like a Google service account JSON."
    cred_fail=1
  fi

  if grep -lE 'BEGIN (RSA )?PRIVATE KEY' "$file" >/dev/null 2>&1; then
    echo "Secret scan failed: $file contains a private key."
    cred_fail=1
  fi

  if grep -lE 'AIza[0-9A-Za-z_-]{35}' "$file" >/dev/null 2>&1; then
    echo "Secret scan failed: $file contains a suspicious Google API key."
    cred_fail=1
  fi

  if grep -lE '(CF|CLOUDFLARE)_(API_)?TOKEN[[:space:]]*=[[:space:]]*["'"'"']?[A-Za-z0-9_-]{40,}' "$file" >/dev/null 2>&1; then
    echo "Secret scan failed: $file contains a suspicious Cloudflare token."
    cred_fail=1
  fi

  if grep -lE '(sk|pk)_(live|test)_[A-Za-z0-9]{24,}' "$file" >/dev/null 2>&1; then
    echo "Secret scan failed: $file contains a suspicious API key."
    cred_fail=1
  fi
done

if [ "$cred_fail" -eq 1 ]; then
  echo
  echo "Move credentials out of the repository before committing."
  echo "Bypass only for verified fixtures with: git commit --no-verify"
  exit 1
fi
