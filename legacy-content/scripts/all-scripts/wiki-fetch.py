#!/usr/bin/env python3
"""
Robust Wikimedia Commons image fetcher with rate-limit mitigation.

Usage:
  legacy-content/scripts/all-scripts/wiki-fetch.py <URL> <OUTPUT_PATH>
  legacy-content/scripts/all-scripts/wiki-fetch.py --batch <FILE>
  legacy-content/scripts/all-scripts/wiki-fetch.py --self-test
"""

import argparse
import fcntl
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

STD_THUMB_SIZES = [3840, 1920, 1280, 960, 500, 330, 250, 120]
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0"
LOCK_PATH = "/tmp/.wiki-fetch.lock"
LAST_REQ_PATH = "/tmp/.wiki-fetch.last"
MIN_INTERVAL_S = 2.0
JITTER_S = 1.0


def politely_wait():
    """Serialize requests across processes to avoid blowing shared rate budgets."""
    with open(LOCK_PATH, "w", encoding="utf-8") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            last = 0.0
            if os.path.exists(LAST_REQ_PATH):
                try:
                    last = float(Path(LAST_REQ_PATH).read_text().strip())
                except (ValueError, OSError):
                    last = 0.0
            now = time.time()
            elapsed = now - last
            wait = MIN_INTERVAL_S + random.uniform(0, JITTER_S) - elapsed
            if wait > 0:
                time.sleep(wait)
            Path(LAST_REQ_PATH).write_text(str(time.time()))
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def commons_file_referer(url: str) -> str:
    match = re.search(
        r"/wikipedia/commons(?:/thumb)?/[0-9a-f]/[0-9a-f]{2}/([^/]+?)(?:/[^/]+)?$",
        url,
    )
    if not match:
        return "https://commons.wikimedia.org/wiki/Main_Page"
    filename = urllib.parse.unquote(match.group(1))
    return f"https://commons.wikimedia.org/wiki/File:{filename}"


def thumb_size_variants(url: str) -> list[str]:
    match = re.match(
        r"^(https://upload\.wikimedia\.org/wikipedia/[a-z]+/thumb/[0-9a-f]/[0-9a-f]{2}/[^/]+/)(\d+)px-(.+)$",
        url,
    )
    if not match:
        return []

    prefix, current_size, suffix = match.group(1), int(match.group(2)), match.group(3)
    variants = []
    for size in STD_THUMB_SIZES:
        if size == current_size:
            continue
        variants.append(f"{prefix}{size}px-{suffix}")
    return variants


def thumb_to_original(url: str) -> Optional[str]:
    match = re.match(
        r"^(https://upload\.wikimedia\.org/wikipedia/[a-z]+)/thumb/([0-9a-f])/([0-9a-f]{2})/([^/]+)/[^/]+$",
        url,
    )
    if not match:
        return None
    return f"{match.group(1)}/{match.group(2)}/{match.group(3)}/{match.group(4)}"


def thumb_php_alternative(url: str) -> Optional[str]:
    match = re.match(
        r"^https://upload\.wikimedia\.org/wikipedia/commons/thumb/[0-9a-f]/[0-9a-f]{2}/([^/]+)/(\d+)px-",
        url,
    )
    if not match:
        return None
    filename, width = match.group(1), match.group(2)
    return f"https://commons.wikimedia.org/w/thumb.php?f={filename}&width={width}"


def wayback_alternative(url: str) -> Optional[str]:
    cdx_url = (
        "https://web.archive.org/cdx/search/cdx?"
        + urllib.parse.urlencode(
            {
                "url": url,
                "output": "json",
                "limit": "-1",
                "filter": "statuscode:200",
            }
        )
    )
    try:
        request = urllib.request.Request(cdx_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
        if not data or len(data) < 2:
            return None
        row = data[-1]
        timestamp, original = row[1], row[2]
        return f"https://web.archive.org/web/{timestamp}id_/{original}"
    except Exception:
        return None


def fetch_once(url: str, referer: str, timeout: int = 30):
    politely_wait()
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.8",
            "Referer": referer,
            "Accept-Encoding": "identity",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return (response.status, 0, response.read(), None)
    except urllib.error.HTTPError as error:
        retry_after = 0
        try:
            retry_after = int(error.headers.get("Retry-After", "0") or "0")
        except (TypeError, ValueError):
            retry_after = 0
        return (error.code, retry_after, None, str(error))
    except Exception as error:
        return (0, 0, None, str(error))


def fetch_with_fallback(url: str, out_path: str, log=print) -> dict:
    if os.path.exists(out_path):
        size = os.path.getsize(out_path)
        if size > 0:
            return {"ok": True, "bytes": size, "strategy": "skip-exists", "attempts": 0}

    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    referer = commons_file_referer(url)
    attempts = []

    candidates = [(url, "as-given")]
    candidates.extend((candidate, f"thumb-variant-{index}") for index, candidate in enumerate(thumb_size_variants(url)))
    original = thumb_to_original(url)
    if original:
        candidates.append((original, "original-full-size"))
    php_alternative = thumb_php_alternative(url)
    if php_alternative:
        candidates.append((php_alternative, "thumb.php-endpoint"))

    for candidate_url, strategy in candidates:
        for attempt in range(3):
            status, retry_after, body, error = fetch_once(candidate_url, referer)
            attempts.append(
                {
                    "url": candidate_url,
                    "strategy": strategy,
                    "status": status,
                    "error": error,
                }
            )
            if status == 200 and body:
                with open(out_path, "wb") as handle:
                    handle.write(body)
                log(
                    f"   OK {os.path.basename(out_path)} ({len(body) // 1024} KB) via {strategy}"
                )
                return {
                    "ok": True,
                    "bytes": len(body),
                    "strategy": strategy,
                    "attempts": attempts,
                }
            if status == 429:
                wait = retry_after if retry_after > 0 else (15 * (2**attempt) + random.uniform(0, 5))
                log(
                    f"   WAIT 429 on {strategy}, retry in {wait:.0f}s (attempt {attempt + 1}/3)"
                )
                time.sleep(wait)
                continue
            if status >= 500:
                wait = 10 * (attempt + 1)
                log(f"   WAIT {status} on {strategy}, retry in {wait}s")
                time.sleep(wait)
                continue
            break

    wayback = wayback_alternative(url)
    if wayback:
        log("   TRY Wayback fallback")
        status, _, body, error = fetch_once(wayback, "https://web.archive.org/")
        attempts.append(
            {"url": wayback, "strategy": "wayback", "status": status, "error": error}
        )
        if status == 200 and body:
            with open(out_path, "wb") as handle:
                handle.write(body)
            log(f"   OK {os.path.basename(out_path)} ({len(body) // 1024} KB) via Wayback")
            return {
                "ok": True,
                "bytes": len(body),
                "strategy": "wayback",
                "attempts": attempts,
            }

    log(f"   FAIL {os.path.basename(out_path)} - all strategies failed")
    return {"ok": False, "bytes": 0, "strategy": "exhausted", "attempts": attempts}


def main():
    parser = argparse.ArgumentParser(
        description="Robust Wikimedia Commons image fetcher"
    )
    parser.add_argument("url", nargs="?", help="Image URL to fetch")
    parser.add_argument("out_path", nargs="?", help="Output file path")
    parser.add_argument("--batch", help="Tab-separated file: URL<TAB>OUT_PATH per line")
    parser.add_argument("--self-test", action="store_true", help="Verify tool works")
    parser.add_argument("--json", action="store_true", help="Emit JSON per fetch")
    args = parser.parse_args()

    if args.self_test:
        test_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/120px-Commons-logo.svg.png"
        test_out = "/tmp/wiki-fetch-self-test.png"
        result = fetch_with_fallback(test_url, test_out)
        if result["ok"]:
            print(
                f"Self-test passed. Strategy: {result['strategy']}, bytes: {result['bytes']}"
            )
            if os.path.exists(test_out):
                os.unlink(test_out)
            sys.exit(0)
        print(f"Self-test failed: {json.dumps(result, ensure_ascii=False, indent=2)}")
        sys.exit(1)

    if args.batch:
        results = []
        with open(args.batch, encoding="utf-8") as handle:
            for line_no, line in enumerate(handle, 1):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("\t")
                if len(parts) != 2:
                    print(
                        f"  WARN line {line_no} malformed (need URL<TAB>OUT_PATH): {line}"
                    )
                    continue
                url, out_path = parts
                print(f"\nFETCH [{line_no}] {os.path.basename(out_path)}")
                result = fetch_with_fallback(url, out_path)
                result["url"] = url
                result["out_path"] = out_path
                results.append(result)
        ok = sum(1 for result in results if result["ok"])
        fail = len(results) - ok
        print(f"\nBatch summary: {ok} ok / {fail} fail")
        if args.json:
            print(json.dumps(results, ensure_ascii=False, indent=2))
        sys.exit(0 if fail == 0 else 1)

    if not args.url or not args.out_path:
        parser.print_help()
        sys.exit(2)

    result = fetch_with_fallback(args.url, args.out_path)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()
