#!/usr/bin/env bash
# Detect articles that look structurally hollow or overly templated.
# Usage: bash tools/detect-ai-hollow.sh [--fix] [--json] [--diff] [--sort]

set -uo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'
YEL='\033[0;33m'
GRN='\033[0;32m'
DIM='\033[0;90m'
CYN='\033[0;36m'
RST='\033[0m'

CONTENT_ROOT="russia-knowledge"
BASELINE_FILE="tools/.hollow-baseline.json"

JSON_MODE=false
FIX_MODE=false
DIFF_MODE=false
SORT_MODE=false
for arg in "$@"; do
  [[ "$arg" == "--json" ]] && JSON_MODE=true
  [[ "$arg" == "--fix" ]] && FIX_MODE=true
  [[ "$arg" == "--diff" ]] && DIFF_MODE=true
  [[ "$arg" == "--sort" ]] && SORT_MODE=true
done

TOTAL=0
SUSPECT=0
declare -a FLAGGED_FILES=()
declare -a SCORES=()
declare -a REASONS=()

scan_file() {
  local f="$1"
  local score=0
  local reasons=""
  local lines
  lines=$(wc -l < "$f")
  lines=${lines//[[:space:]]/}

  [[ $lines -lt 12 ]] && return

  local bullet_lines
  bullet_lines=$(grep -c '^- \*\*' "$f" 2>/dev/null || echo "0")
  bullet_lines=${bullet_lines//[[:space:]]/}
  local bullet_ratio=0
  if [[ $lines -gt 0 ]]; then
    bullet_ratio=$((bullet_lines * 100 / lines))
  fi
  if [[ $bullet_ratio -gt 30 ]]; then
    score=$((score + 3))
    reasons="${reasons}bullet-density:${bullet_ratio}% "
  elif [[ $bullet_ratio -gt 20 ]]; then
    score=$((score + 1))
    reasons="${reasons}bullet-density:${bullet_ratio}% "
  fi

  local year_count
  year_count=$(grep -oE '\b(1[6-9][0-9]{2}|20[0-3][0-9])\b' "$f" | grep -v 'date:' | wc -l | tr -d '[:space:]')
  if [[ $year_count -lt 2 ]]; then
    score=$((score + 3))
    reasons="${reasons}few-years:${year_count} "
  elif [[ $year_count -lt 5 ]]; then
    score=$((score + 1))
    reasons="${reasons}years:${year_count} "
  fi

  local url_count
  url_count=$(grep -c 'http' "$f" 2>/dev/null || echo "0")
  url_count=${url_count//[[:space:]]/}
  if [[ $url_count -eq 0 ]]; then
    score=$((score + 3))
    reasons="${reasons}no-urls "
  elif [[ $url_count -lt 3 ]]; then
    score=$((score + 1))
    reasons="${reasons}few-urls:${url_count} "
  fi

  local hollow_count
  hollow_count=$(grep -oE 'important|significant|rich|comprehensive|diverse|actively|rapidly|gradually|steadily|continuously|increasingly|further|deeply|effectively|vibrant|not only|but also|serves as|plays a role|demonstrates|reflects|highlights|underscores' "$f" | wc -l | tr -d '[:space:]')
  if [[ $hollow_count -gt 15 ]]; then
    score=$((score + 3))
    reasons="${reasons}hollow-terms:${hollow_count} "
  elif [[ $hollow_count -gt 8 ]]; then
    score=$((score + 2))
    reasons="${reasons}hollow-terms:${hollow_count} "
  elif [[ $hollow_count -gt 4 ]]; then
    score=$((score + 1))
    reasons="${reasons}hollow-terms:${hollow_count} "
  fi

  local prose_lines
  prose_lines=$(grep -cvE '^(#|-|\*|\||>|$|---|\s*$|title:|description:|date:|tags:|category:|author:|featured:|last)' "$f" 2>/dev/null || echo "0")
  prose_lines=$(echo "$prose_lines" | tr -d '[:space:]')
  if [[ $prose_lines -lt 5 ]]; then
    score=$((score + 3))
    reasons="${reasons}prose-lines:${prose_lines} "
  elif [[ $prose_lines -lt 15 ]]; then
    score=$((score + 1))
    reasons="${reasons}prose-lines:${prose_lines} "
  fi

  if grep -q 'lastHumanReview: false' "$f" 2>/dev/null; then
    score=$((score + 1))
    reasons="${reasons}lastHumanReview:false "
  fi

  local max_consecutive=0
  local current=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^-\ \*\* ]]; then
      current=$((current + 1))
      [[ $current -gt $max_consecutive ]] && max_consecutive=$current
    else
      current=0
    fi
  done < "$f"
  if [[ $max_consecutive -ge 6 ]]; then
    score=$((score + 2))
    reasons="${reasons}repeated-bullets:${max_consecutive} "
  elif [[ $max_consecutive -ge 4 ]]; then
    score=$((score + 1))
    reasons="${reasons}repeated-bullets:${max_consecutive} "
  fi

  local plastic_count
  plastic_count=$(grep -ciE 'not only.{0,20}but also|is not just.{0,20}but|serves as.{0,20}|plays a(n)? .{0,20} role|reflects the.{0,20}|demonstrates the.{0,20}|from .{2,20} to .{2,20}, from .{2,20} to|underscores the.{0,20}|stands as.{0,20}|embodies the.{0,20}' "$f" 2>/dev/null || echo "0")
  plastic_count=${plastic_count//[[:space:]]/}
  if [[ $plastic_count -gt 8 ]]; then
    score=$((score + 3))
    reasons="${reasons}plastic-phrases:${plastic_count} "
  elif [[ $plastic_count -gt 4 ]]; then
    score=$((score + 2))
    reasons="${reasons}plastic-phrases:${plastic_count} "
  elif [[ $plastic_count -gt 2 ]]; then
    score=$((score + 1))
    reasons="${reasons}plastic-phrases:${plastic_count} "
  fi

  local in_frontmatter=true
  local check_lines=0
  local textbook_opening=false
  while IFS= read -r line; do
    if [[ "$in_frontmatter" == true ]]; then
      if [[ "$line" == "---" ]] && [[ $check_lines -eq 0 ]]; then
        check_lines=-1
      elif [[ "$line" == "---" ]] && [[ $check_lines -eq -1 ]]; then
        in_frontmatter=false
        check_lines=0
      fi
      continue
    fi
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    check_lines=$((check_lines + 1))
    if [[ $check_lines -le 2 ]]; then
      if echo "$line" | grep -qiE '^(russia|russian|moscow|saint petersburg).{0,20}(is|has|was)|^as a .{2,20}, (russia|moscow)|^in the area of .{2,20}, (russia|moscow)|^(this|these) article(s)? (explore|describe|cover)'; then
        textbook_opening=true
      fi
    fi
    [[ $check_lines -ge 3 ]] && break
  done < "$f"
  if [[ "$textbook_opening" == true ]]; then
    score=$((score + 2))
    reasons="${reasons}textbook-opening "
  fi

  local tail_text
  tail_text=$(tail -20 "$f" | grep -v '^$' | grep -v '^#' | grep -v '^\-' | grep -v '^http' | tail -5)
  if echo "$tail_text" | grep -qiE 'in conclusion|to sum up|looking ahead|overall|in summary|future outlook|will continue to|remains to be seen|worth watching'; then
    score=$((score + 2))
    reasons="${reasons}formulaic-ending "
  fi

  local template_h2=0
  local h2_list
  h2_list=$(grep '^## ' "$f" | sed 's/^## //')
  while IFS= read -r h2; do
    [[ -z "$h2" ]] && continue
    if echo "$h2" | grep -qiE '^(history|historical background|development|current situation|current state|today|present|future|future outlook|future trends|conclusion|summary|challenges and opportunities|impact and significance|features|importance|international comparison)$'; then
      template_h2=$((template_h2 + 1))
    fi
  done <<< "$h2_list"
  if [[ $template_h2 -ge 4 ]]; then
    score=$((score + 3))
    reasons="${reasons}template-h2:${template_h2} "
  elif [[ $template_h2 -ge 3 ]]; then
    score=$((score + 2))
    reasons="${reasons}template-h2:${template_h2} "
  elif [[ $template_h2 -ge 2 ]]; then
    score=$((score + 1))
    reasons="${reasons}template-h2:${template_h2} "
  fi

  TOTAL=$((TOTAL + 1))
  if [[ $score -ge 4 ]]; then
    SUSPECT=$((SUSPECT + 1))
    local rel="${f#${CONTENT_ROOT}/}"
    FLAGGED_FILES+=("$rel")
    SCORES+=("$score")
    REASONS+=("$reasons")
  fi
}

if [[ "$JSON_MODE" == false ]]; then
  echo ""
  echo "Scanning ${CONTENT_ROOT}/ for structurally hollow articles"
  echo "Score bands: 0-3 ok, 4-7 suspicious, 8+ highly suspicious"
  echo ""
fi

while IFS= read -r -d '' file; do
  scan_file "$file"
done < <(find "$CONTENT_ROOT" -name '*.md' -print0 | sort -z)

if [[ "$SORT_MODE" == true ]] && [[ ${#SCORES[@]} -gt 0 ]]; then
  sorted_indices=()
  while IFS= read -r idx; do
    sorted_indices+=("$idx")
  done < <(
    for i in "${!SCORES[@]}"; do
      echo "$i ${SCORES[$i]}"
    done | sort -k2 -nr | awk '{print $1}'
  )
else
  sorted_indices=()
  for i in "${!SCORES[@]}"; do
    sorted_indices+=("$i")
  done
fi

BASELINE_TMP=""
if [[ "$DIFF_MODE" == true ]] && [[ -f "$BASELINE_FILE" ]]; then
  BASELINE_TMP=$(mktemp)
  python3 -c "
import json
try:
  data = json.load(open('$BASELINE_FILE'))
  for f in data.get('files', []):
    print(f['file'] + '\t' + str(f['score']))
except Exception:
  pass
" > "$BASELINE_TMP" 2>/dev/null || true
fi

baseline_lookup() {
  local file="$1"
  if [[ -n "$BASELINE_TMP" && -f "$BASELINE_TMP" ]]; then
    grep "^${file}	" "$BASELINE_TMP" 2>/dev/null | cut -f2 | head -1
  fi
}

if [[ "$JSON_MODE" == false ]]; then
  new_count=0
  improved_count=0
  worsened_count=0

  for idx in "${sorted_indices[@]}"; do
    rel="${FLAGGED_FILES[$idx]}"
    sc="${SCORES[$idx]}"
    rs="${REASONS[$idx]}"

    diff_tag=""
    if [[ "$DIFF_MODE" == true ]]; then
      old_score=$(baseline_lookup "$rel")
      if [[ -n "$old_score" ]]; then
        if [[ $sc -gt $old_score ]]; then
          diff_tag=" ${RED}↑${old_score}→${sc}${RST}"
          worsened_count=$((worsened_count + 1))
        elif [[ $sc -lt $old_score ]]; then
          diff_tag=" ${GRN}↓${old_score}→${sc}${RST}"
          improved_count=$((improved_count + 1))
        fi
      else
        diff_tag=" ${CYN}NEW${RST}"
        new_count=$((new_count + 1))
      fi
    fi

    if [[ $sc -ge 8 ]]; then
      echo -e "${RED}[${sc}] $rel${diff_tag}${RST}"
      echo -e "  ${DIM}${rs}${RST}"
    elif [[ $sc -ge 4 ]]; then
      echo -e "${YEL}[${sc}] $rel${diff_tag}${RST}"
      echo -e "  ${DIM}${rs}${RST}"
    fi
  done

  echo ""
  echo "Summary: scanned ${TOTAL} markdown files"
  if [[ $SUSPECT -gt 0 ]]; then
    red_count=0
    yellow_count=0
    for sc in "${SCORES[@]}"; do
      [[ $sc -ge 8 ]] && red_count=$((red_count + 1))
      [[ $sc -ge 4 && $sc -lt 8 ]] && yellow_count=$((yellow_count + 1))
    done
    echo -e "${RED}Highly suspicious: ${red_count}${RST}"
    echo -e "${YEL}Suspicious: ${yellow_count}${RST}"
    echo -e "${GRN}Passed: $((TOTAL - SUSPECT))${RST}"
  else
    echo -e "${GRN}All files passed${RST}"
  fi

  if [[ "$DIFF_MODE" == true ]]; then
    fixed_count=0
    if [[ -n "$BASELINE_TMP" && -f "$BASELINE_TMP" ]]; then
      while IFS=$'\t' read -r bfile bscore; do
        [[ -z "$bfile" ]] && continue
        found=false
        for ffile in "${FLAGGED_FILES[@]}"; do
          [[ "$ffile" == "$bfile" ]] && found=true && break
        done
        [[ "$found" == false ]] && fixed_count=$((fixed_count + 1))
      done < "$BASELINE_TMP"
    fi

    echo ""
    echo "Diff vs baseline"
    echo -e "${CYN}New: ${new_count}${RST}"
    echo -e "${RED}Worsened: ${worsened_count}${RST}"
    echo -e "${GRN}Improved: ${improved_count}${RST}"
    echo -e "${GRN}Fixed: ${fixed_count}${RST}"
  fi
fi

if [[ "$JSON_MODE" == true ]]; then
  echo "{"
  echo "  \"version\": \"2.0\","
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"total\": $TOTAL,"
  echo "  \"flagged\": $SUSPECT,"
  echo "  \"red\": $(printf '%s\n' "${SCORES[@]}" | awk '$1>=8' | wc -l | tr -d '[:space:]'),"
  echo "  \"yellow\": $(printf '%s\n' "${SCORES[@]}" | awk '$1>=4 && $1<8' | wc -l | tr -d '[:space:]'),"
  echo "  \"files\": ["
  first=true
  for idx in "${sorted_indices[@]}"; do
    [[ "$first" == true ]] && first=false || echo ","
    printf '    {"file": "%s", "score": %s, "reasons": "%s"}' \
      "${FLAGGED_FILES[$idx]}" "${SCORES[$idx]}" "$(echo "${REASONS[$idx]}" | sed 's/ *$//')"
  done
  echo ""
  echo "  ]"
  echo "}"
fi

{
  echo "{"
  echo "  \"version\": \"2.0\","
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"total\": $TOTAL,"
  echo "  \"flagged\": $SUSPECT,"
  echo "  \"files\": ["
  first=true
  for idx in "${sorted_indices[@]}"; do
    [[ "$first" == true ]] && first=false || echo ","
    printf '    {"file": "%s", "score": %s}' "${FLAGGED_FILES[$idx]}" "${SCORES[$idx]}"
  done
  echo ""
  echo "  ]"
  echo "}"
} > "$BASELINE_FILE"

if [[ "$FIX_MODE" == true ]] && [[ $SUSPECT -gt 0 ]]; then
  echo ""
  echo "Marking flagged files as not human-reviewed"
  for f in "${FLAGGED_FILES[@]}"; do
    full="${CONTENT_ROOT}/$f"
    if grep -q 'lastHumanReview: true' "$full" 2>/dev/null; then
      sed -i '' 's/lastHumanReview: true/lastHumanReview: false/' "$full"
      echo "  updated $f"
    fi
  done
fi
