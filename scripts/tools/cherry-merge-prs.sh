#!/usr/bin/env bash
# Cherry-merge with API-based file listing (handles >300 files)
set -uo pipefail

PRS=("$@")
SUCCESS=()
FAILED=()

for pr in "${PRS[@]}"; do
  echo ""
  echo "═══ PR #$pr ═══"

  state=$(gh pr view "$pr" --json state 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['state'])" 2>/dev/null)
  if [[ "$state" == "MERGED" ]] || [[ "$state" == "CLOSED" ]]; then
    echo "  ⏭️  $state"
    continue
  fi

  if ! git fetch origin "pull/$pr/head:tmp-pr-$pr" --quiet 2>/dev/null; then
    echo "  ❌ fetch failed"
    FAILED+=("$pr")
    continue
  fi

  count=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    [[ "$f" == "knowledge/_translations.json" ]] && continue
    [[ "$f" != "knowledge/"*".md" ]] && continue
    if git checkout "tmp-pr-$pr" -- "$f" 2>/dev/null; then
      count=$((count+1))
    else
      echo "  ⚠️ skip: $f"
    fi
  done < <(gh api "repos/frank890417/taiwan-md/pulls/$pr/files" --paginate --jq '.[].filename' 2>/dev/null)

  if [[ $count -eq 0 ]]; then
    echo "  ❌ no files checked out"
    git reset --hard HEAD --quiet 2>/dev/null
    git branch -D "tmp-pr-$pr" 2>/dev/null
    FAILED+=("$pr")
    continue
  fi

  python3 scripts/tools/sync-translations-json.py >/dev/null 2>&1
  git add knowledge/

  if git commit -m "Merge PR #$pr (batch cherry-pick): $count files via API + sync" --no-verify --quiet 2>/dev/null; then
    title=$(gh pr view "$pr" --json title 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['title'])" 2>/dev/null || echo "PR #$pr")
    echo "  ✅ $count files: $title"
    SUCCESS+=("$pr")
  else
    echo "  ⚠️ nothing new (already in main)"
    SUCCESS+=("$pr")
  fi

  git branch -D "tmp-pr-$pr" 2>/dev/null
  git push --quiet 2>/dev/null || { echo "  ❌ push failed"; FAILED+=("$pr"); break; }
  sleep 1
done

echo ""
echo "═══════════════════════════════════"
echo "✅ Success: ${#SUCCESS[@]}"
echo "❌ Failed: ${#FAILED[@]} (${FAILED[*]:-none})"
