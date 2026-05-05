#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "ERROR: dist/ directory not found at $DIST_DIR" >&2
  echo "Run 'npm run build' first." >&2
  exit 1
fi

exec python3 - "$DIST_DIR" <<'PYTHON_SCRIPT'
import html.parser
import os
import sys
from pathlib import Path
from urllib.parse import unquote

dist_dir = Path(sys.argv[1])


class LinkExtractor(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href", "")
        if href.startswith("/"):
            self.links.append(href)


def href_exists(href: str) -> bool:
    clean = href.split("#", 1)[0].split("?", 1)[0]
    if clean in {"", "/"}:
        return (dist_dir / "index.html").is_file()

    decoded = unquote(clean).lstrip("/")
    exact = dist_dir / decoded
    as_html = dist_dir / f"{decoded}.html"
    as_index = dist_dir / decoded / "index.html"

    return exact.is_file() or as_html.is_file() or as_index.is_file()


html_files = sorted(dist_dir.rglob("*.html"))
broken = []
checked = 0

for html_file in html_files:
    parser = LinkExtractor()
    parser.feed(html_file.read_text(encoding="utf-8"))
    for href in parser.links:
      checked += 1
      if not href_exists(href):
          broken.append((html_file.relative_to(dist_dir).as_posix(), href))

if broken:
    print(f"Broken internal links found: {len(broken)} of {checked}", file=sys.stderr)
    for page, href in broken:
        print(f"- {page}: {href}", file=sys.stderr)
    sys.exit(1)

print(f"Verified {checked} internal links across {len(html_files)} HTML files.")
PYTHON_SCRIPT
