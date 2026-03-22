#!/bin/bash

set -euo pipefail

TIMEOUT="${TIMEOUT:-10}"
REPORT_FILE="dead-links-report-$(date +%Y%m%d-%H%M%S).txt"
TEMP_DIR="$(mktemp -d)"
URL_LIST="$TEMP_DIR/urls.txt"
RESULTS_FILE="$TEMP_DIR/results.txt"
USER_AGENT="Russia.md Link Checker"

SCAN_PATHS=("$@")
if [ "${#SCAN_PATHS[@]}" -eq 0 ]; then
  SCAN_PATHS=(
    "russia-knowledge"
    "docs"
    "README.md"
    "CONTRIBUTING.md"
    "SKILLS.md"
  )
fi

IGNORE_PATTERNS=(
  "^https://github.com/"
  "^https://api.github.com/"
  "^https://www.linkedin.com/"
  "^https://www.facebook.com/"
  "^https://www.instagram.com/"
  "^mailto:"
)

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

normalize_url() {
  local url="$1"
  url="${url%\`}"
  url="${url%\"}"
  url="${url%\'}"
  url="${url%\.}"
  url="${url%,}"
  url="${url%;}"
  printf '%s' "$url"
}

check_url() {
  local file="$1"
  local line="$2"
  local url
  url="$(normalize_url "$3")"

  for pattern in "${IGNORE_PATTERNS[@]}"; do
    if [[ "$url" =~ $pattern ]]; then
      printf 'SKIP|%s|%s|%s|ignored pattern\n' "$file" "$line" "$url"
      return
    fi
  done

  if [[ ! "$url" =~ ^https?:// ]]; then
    return
  fi

  local status_code
  status_code="$(
    curl -sSIL -o /dev/null -w '%{http_code}' \
      --connect-timeout "$TIMEOUT" \
      --max-time "$TIMEOUT" \
      --user-agent "$USER_AGENT" \
      "$url" 2>/dev/null || echo "000"
  )"

  case "$status_code" in
    2*|3*)
      printf 'OK|%s|%s|%s|HTTP %s\n' "$file" "$line" "$url" "$status_code"
      ;;
    403)
      printf 'SKIP|%s|%s|%s|HTTP 403 (common anti-bot response)\n' "$file" "$line" "$url"
      ;;
    4*|5*)
      printf 'DEAD|%s|%s|%s|HTTP %s\n' "$file" "$line" "$url" "$status_code"
      ;;
    *)
      printf 'ERROR|%s|%s|%s|request failed or timed out\n' "$file" "$line" "$url"
      ;;
  esac
}

for path in "${SCAN_PATHS[@]}"; do
  if [ -d "$path" ]; then
    rg -H -n -o 'https?://[^[:space:]<>()"]+' "$path" -g '*.md' >> "$URL_LIST" || true
  elif [ -f "$path" ]; then
    rg -H -n -o 'https?://[^[:space:]<>()"]+' "$path" >> "$URL_LIST" || true
  fi
done

if [ ! -f "$URL_LIST" ] || [ ! -s "$URL_LIST" ]; then
  echo "No URLs found in: ${SCAN_PATHS[*]}"
  exit 0
fi

awk -F: '
  {
    file=$1
    line=$2
    url=$3
    sub(/^[^:]+:[0-9]+:/, "", $0)
    url=$0
    key=file "|" line "|" url
    if (!seen[key]++) {
      print file "|" line "|" url
    }
  }
' "$URL_LIST" > "$TEMP_DIR/unique-urls.txt"

total_links="$(wc -l < "$TEMP_DIR/unique-urls.txt" | tr -d ' ')"
echo "Scanning $total_links URLs from: ${SCAN_PATHS[*]}"

while IFS='|' read -r file line url; do
  check_url "$file" "$line" "$url"
done < "$TEMP_DIR/unique-urls.txt" > "$RESULTS_FILE"

ok_count=0
dead_count=0
error_count=0
skip_count=0

{
  echo "# Russia.md dead link report"
  echo "# generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "# scanned paths: ${SCAN_PATHS[*]}"
  echo
} > "$REPORT_FILE"

while IFS='|' read -r status file line url message; do
  case "$status" in
    OK)
      ok_count=$((ok_count + 1))
      ;;
    DEAD)
      dead_count=$((dead_count + 1))
      printf 'DEAD  %s:%s  %s  (%s)\n' "$file" "$line" "$url" "$message"
      printf 'DEAD|%s|%s|%s|%s\n' "$file" "$line" "$url" "$message" >> "$REPORT_FILE"
      ;;
    ERROR)
      error_count=$((error_count + 1))
      printf 'ERROR %s:%s  %s  (%s)\n' "$file" "$line" "$url" "$message"
      printf 'ERROR|%s|%s|%s|%s\n' "$file" "$line" "$url" "$message" >> "$REPORT_FILE"
      ;;
    SKIP)
      skip_count=$((skip_count + 1))
      ;;
  esac
done < "$RESULTS_FILE"

echo
echo "OK: $ok_count"
echo "DEAD: $dead_count"
echo "ERROR: $error_count"
echo "SKIP: $skip_count"
echo "TOTAL: $total_links"

if [ "$dead_count" -gt 0 ] || [ "$error_count" -gt 0 ]; then
  echo
  echo "Detailed report: $REPORT_FILE"
  exit 1
fi

rm -f "$REPORT_FILE"
