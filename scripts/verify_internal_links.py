#!/usr/bin/env python3

import html.parser
import multiprocessing as mp
import os
import random
import sys
from pathlib import Path
from urllib.parse import unquote


DIST_DIR = Path(sys.argv[1])
SAMPLE_SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 0


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


def href_exists(href_cache, href):
    cached = href_cache.get(href)
    if cached is not None:
        return cached

    clean = href.split("#", 1)[0].split("?", 1)[0]
    if clean in {"", "/"}:
      exists = (DIST_DIR / "index.html").is_file()
      href_cache[href] = exists
      return exists

    decoded = unquote(clean).lstrip("/")
    exact = DIST_DIR / decoded
    as_html = DIST_DIR / f"{decoded}.html"
    as_index = DIST_DIR / decoded / "index.html"

    exists = exact.is_file() or as_html.is_file() or as_index.is_file()
    href_cache[href] = exists
    return exists


def scan_chunk(files):
    broken = []
    checked = 0
    href_cache = {}

    for html_file in files:
        parser = LinkExtractor()
        parser.feed(html_file.read_text(encoding="utf-8"))
        seen = set()
        for href in parser.links:
            if href in seen:
                continue
            seen.add(href)
            checked += 1
            if not href_exists(href_cache, href):
                broken.append((html_file.relative_to(DIST_DIR).as_posix(), href))

    return checked, broken


def chunk_files(files, workers):
    if workers <= 1:
        return [files]
    size = max(1, (len(files) + workers - 1) // workers)
    return [files[i : i + size] for i in range(0, len(files), size)]


def main():
    html_files = sorted(DIST_DIR.rglob("*.html"))

    if SAMPLE_SIZE > 0 and SAMPLE_SIZE < len(html_files):
        rng = random.Random(42)
        html_files = sorted(rng.sample(html_files, SAMPLE_SIZE))

    workers = min(8, os.cpu_count() or 1, len(html_files) or 1)
    chunks = chunk_files(html_files, workers)

    if workers > 1 and len(chunks) > 1:
        with mp.Pool(processes=workers) as pool:
            results = pool.map(scan_chunk, chunks)
    else:
        results = [scan_chunk(chunks[0] if chunks else [])]

    checked = sum(item[0] for item in results)
    broken = [entry for _, items in results for entry in items]

    if broken:
        print(f"Broken internal links found: {len(broken)} of {checked}", file=sys.stderr)
        for page, href in broken:
            print(f"- {page}: {href}", file=sys.stderr)
        sys.exit(1)

    print(f"Verified {checked} internal links across {len(html_files)} HTML files.")


if __name__ == "__main__":
    main()
