#!/usr/bin/env python3
"""
batch_extract.py — Batch HLS/YouTube stream extraction for all 2,141 webcams.

Reads <this-dir>/all_webcam_urls.json, calls extract_stream_info() from
extract_streams.py (same directory) for every camera detail page
concurrently (5 workers, ~3-5 req/s), groups results by country, runs
inline m3u8 and YouTube embed verification, and writes the final dataset.

Output files:
    <this-dir>/webcams.json               — grouped & sorted extraction results
    <this-dir>/batch_stats.json           — per-country & overall statistics
    <this-dir>/verification_results.json  — inline verification report

Runtime: ~10-15 minutes for all 2,141 URLs.
"""

from __future__ import annotations

import json
import os
import random
import subprocess
import sys
import threading
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Import extract_stream_info from the extract_streams module (same directory)
# ---------------------------------------------------------------------------
_BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)
from extract_streams import extract_stream_info  # type: ignore[import-untyped]

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

INPUT_FILE: str = os.path.join(_BASE_DIR, "all_webcam_urls.json")
OUTPUT_WEBCAMS: str = os.path.join(_BASE_DIR, "webcams.json")
OUTPUT_STATS: str = os.path.join(_BASE_DIR, "batch_stats.json")
OUTPUT_VERIFY: str = os.path.join(_BASE_DIR, "verification_results.json")

MAX_WORKERS: int = 5
SUBMIT_DELAY_MIN: float = 0.12
SUBMIT_DELAY_MAX: float = 0.30
PER_TASK_TIMEOUT: int = 90  # seconds per extract_stream_info call
PROGRESS_INTERVAL: int = 100

HLS_VERIFY_COUNT: int = 40
HLS_MIN_COUNTRIES: int = 15
YT_VERIFY_COUNT: int = 5


# ======================================================================
# Utility helpers
# ======================================================================

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _curl_http_code(url: str, timeout: int = 10) -> int | None:
    """Return HTTP status code for *url* via curl, or None on failure."""
    try:
        cp = subprocess.run(
            [
                "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                "--max-time", str(timeout),
                "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                url,
            ],
            capture_output=True, text=True, timeout=timeout + 3,
        )
        code = cp.stdout.strip()
        return int(code) if code.isdigit() else None
    except Exception:
        return None


def _curl_body_head(url: str, timeout: int = 10, max_bytes: int = 300) -> str:
    """Return the first *max_bytes* bytes of the response body, or ''."""
    try:
        cp = subprocess.run(
            [
                "curl", "-s", "--max-time", str(timeout),
                "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                url,
            ],
            capture_output=True, text=True, timeout=timeout + 3,
        )
        return cp.stdout[:max_bytes]
    except Exception:
        return ""


# ======================================================================
# Thread-safe progress tracker
# ======================================================================

class ProgressTracker:
    """Counts completed extractions and prints periodic progress reports."""

    def __init__(self, total: int) -> None:
        self._lock = threading.Lock()
        self.total = total
        self.done = 0
        self.buckets: Dict[str, int] = {"online": 0, "youtube": 0,
                                         "offline": 0, "error": 0}

    def record(self, result: dict) -> None:
        with self._lock:
            self.done += 1
            status = result.get("status", "error")
            if status == "online":
                self.buckets["online"] += 1
            elif status == "youtube":
                self.buckets["youtube"] += 1
            elif status == "offline":
                self.buckets["offline"] += 1
            else:
                self.buckets["error"] += 1

            if self.done % PROGRESS_INTERVAL == 0 or self.done == self.total:
                b = self.buckets
                print(
                    f"[{self.done}/{self.total}] Processed — "
                    f"{b['online']} online HLS, {b['youtube']} youtube, "
                    f"{b['offline']} offline, {b['error']} errors",
                    flush=True,
                )


# ======================================================================
# Single-item extraction with hard timeout
# ======================================================================

def extract_one(item: Dict[str, Any]) -> Dict[str, Any]:
    """Call extract_stream_info for *item*, with a per-call timeout.

    The timeout is implemented by submitting extract_stream_info to a
    single-worker ThreadPoolExecutor and using future.result(timeout=…).
    signal.alarm() is NOT used because it only works in the main thread.
    """
    link_text = item.get("link_text", "")
    page_url = item.get("full_url", "")

    fallback: Dict[str, Any] = {
        "name": link_text,
        "url": page_url,
        "status": "error",
        "token": None,
        "full_stream_url": None,
        "m3u8_verified": False,
        "stream_type": "none",
        "thumbnail_url": None,
        "error": "extraction_timeout",
    }

    with ThreadPoolExecutor(max_workers=1) as inner:
        fut = inner.submit(extract_stream_info, link_text, page_url)
        try:
            info = fut.result(timeout=PER_TASK_TIMEOUT)
        except Exception:
            info = fallback

    # Enrich with top-level metadata from the input record
    enriched: Dict[str, Any] = {
        "country": item.get("country", ""),
        "region": item.get("region", ""),
        "city": item.get("city", ""),
        "camera_name": item.get("camera_name", ""),
        "link_text": link_text,
        "page_url": page_url,
        "status": info.get("status", "error"),
        "token": info.get("token"),
        "full_stream_url": info.get("full_stream_url"),
        "m3u8_verified": info.get("m3u8_verified", False),
        "stream_type": info.get("stream_type", "none"),
        "thumbnail_url": info.get("thumbnail_url"),
        "error": info.get("error"),
    }
    return enriched


# ======================================================================
# Concurrent extraction pipeline
# ======================================================================

def run_batch(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process all *items* concurrently with a submission rate limiter.

    Returns results in the *same order* as the input list.
    """
    total = len(items)
    tracker = ProgressTracker(total)

    results_map: Dict[int, Dict[str, Any]] = {}
    map_lock = threading.Lock()

    def _worker(idx: int, item: Dict[str, Any]) -> None:
        result = extract_one(item)
        with map_lock:
            results_map[idx] = result
        tracker.record(result)

    print(f"\n{'='*60}")
    print(f"  Batch extraction: {total} URLs, {MAX_WORKERS} workers")
    print(f"  Rate: {SUBMIT_DELAY_MIN}-{SUBMIT_DELAY_MAX}s between submissions")
    print(f"  Per-task timeout: {PER_TASK_TIMEOUT}s")
    print(f"{'='*60}\n", flush=True)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futs: List = []
        for idx, item in enumerate(items):
            futs.append(pool.submit(_worker, idx, item))
            time.sleep(random.uniform(SUBMIT_DELAY_MIN, SUBMIT_DELAY_MAX))

        # Drain remaining futures (should all be done by now)
        for fut in as_completed(futs):
            try:
                fut.result(timeout=5)
            except Exception:
                pass

    # Reconstruct original ordering
    return [results_map[i] for i in range(total)]


# ======================================================================
# Grouping & sorting
# ======================================================================

def group_and_sort(results: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Group by country, sort countries alphabetically, sort cameras within
    each country by link_text (case-insensitive)."""
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in results:
        grouped[r.get("country", "unknown")].append(r)

    out: Dict[str, List[Dict[str, Any]]] = {}
    for country in sorted(grouped.keys()):
        out[country] = sorted(grouped[country],
                              key=lambda x: (x.get("link_text", "") or "").lower())
    return out


# ======================================================================
# Statistics
# ======================================================================

def compute_stats(results: List[Dict[str, Any]], elapsed: float) -> Dict[str, Any]:
    total = len(results)

    status_counter: Counter = Counter(r.get("status", "error") for r in results)
    online_hls = status_counter.get("online", 0)
    youtube = status_counter.get("youtube", 0)
    offline = status_counter.get("offline", 0)
    error = total - online_hls - youtube - offline

    per_country: Dict[str, Dict[str, int]] = {}
    for r in results:
        c = r.get("country", "unknown")
        if c not in per_country:
            per_country[c] = {"total": 0, "online_hls": 0, "youtube": 0,
                              "offline": 0, "error": 0}
        per_country[c]["total"] += 1
        st = r.get("status", "error")
        if st == "online":
            per_country[c]["online_hls"] += 1
        elif st == "youtube":
            per_country[c]["youtube"] += 1
        elif st == "offline":
            per_country[c]["offline"] += 1
        else:
            per_country[c]["error"] += 1

    return {
        "total_urls": total,
        "total_countries": len(per_country),
        "online_hls": online_hls,
        "youtube": youtube,
        "offline": offline,
        "error": error,
        "elapsed_seconds": round(elapsed, 1),
        "requests_per_second": round(total / elapsed, 2) if elapsed > 0 else 0,
        "per_country": dict(sorted(per_country.items())),
        "generated_at": _now_iso(),
    }


def print_summary(stats: Dict[str, Any]) -> None:
    print("\n" + "=" * 72)
    print("  BATCH EXTRACTION SUMMARY")
    print("=" * 72)
    print(f"  Total URLs  : {stats['total_urls']:>6}")
    print(f"  Online HLS  : {stats['online_hls']:>6}")
    print(f"  YouTube     : {stats['youtube']:>6}")
    print(f"  Offline     : {stats['offline']:>6}")
    print(f"  Errors      : {stats['error']:>6}")
    print(f"  Countries   : {stats['total_countries']:>6}")
    print(f"  Elapsed     : {stats['elapsed_seconds']:>6.1f}s")
    print(f"  Throughput  : {stats['requests_per_second']:>6.2f} req/s")
    print("=" * 72)

    print(f"\n  {'Country':<28} {'Total':>6} {'HLS':>6} {'YT':>6} {'Off':>6} {'Err':>6}")
    print("  " + "-" * 64)
    for country, cst in stats["per_country"].items():
        print(f"  {country:<28.28} {cst['total']:>6} {cst['online_hls']:>6} "
              f"{cst['youtube']:>6} {cst['offline']:>6} {cst['error']:>6}")
    print("  " + "-" * 64 + "\n")


# ======================================================================
# Inline verification — HLS (with fresh-token re-extraction)
# ======================================================================

def verify_hls(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Pick ~40 online HLS streams from ≥15 countries; verify via curl.

    Tokens are short-lived (expire within minutes), so we re-extract a
    fresh token from the camera detail page for each verification check.
    """
    hls_pool = [r for r in results
                if r.get("status") == "online"
                and r.get("stream_type") == "hls"
                and r.get("page_url")]

    if not hls_pool:
        print("[verify] No online HLS streams found.", flush=True)
        return {"checked": 0, "passed": 0, "pass_rate": 0, "details": []}

    by_country: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in hls_pool:
        by_country[r.get("country", "unknown")].append(r)

    countries = list(by_country.keys())
    sel_countries = random.sample(countries, min(HLS_MIN_COUNTRIES, len(countries)))

    selected: List[Dict[str, Any]] = []
    per_c = max(1, HLS_VERIFY_COUNT // len(sel_countries))
    for c in sel_countries:
        cams = by_country[c]
        selected.extend(random.sample(cams, min(per_c, len(cams))))

    if len(selected) < HLS_VERIFY_COUNT:
        remaining = [r for r in hls_pool if r not in selected]
        extra = random.sample(remaining, min(HLS_VERIFY_COUNT - len(selected), len(remaining)))
        selected.extend(extra)

    selected = random.sample(selected, min(HLS_VERIFY_COUNT, len(selected)))
    sampled_countries = sorted(set(r["country"] for r in selected))

    print(f"\n[verify] Checking {len(selected)} HLS streams "
          f"({len(sampled_countries)} countries) with fresh tokens...\n", flush=True)

    details: List[Dict[str, Any]] = []
    passed = 0
    for r in selected:
        # Re-extract fresh token — tokens expire within minutes
        fresh = extract_stream_info(r["link_text"], r["page_url"])
        fresh_url = fresh.get("full_stream_url", "")
        verified = fresh.get("m3u8_verified", False)

        # Double-check with curl for independent confirmation
        http_code = _curl_http_code(fresh_url)
        body_head = _curl_body_head(fresh_url) if http_code == 200 else ""

        if verified:
            passed += 1

        details.append({
            "country": r["country"],
            "camera_name": r["camera_name"],
            "stream_url": fresh_url,
            "http_code": http_code,
            "valid": verified,
            "playlist_prefix": body_head[:120],
        })
        icon = "PASS" if verified else "FAIL"
        print(f"  [{icon}] {r['country']}/{r['camera_name']}: HTTP {http_code}", flush=True)
        # Pause to avoid overwhelming the server
        time.sleep(random.uniform(0.15, 0.35))

    pass_rate = round(100 * passed / len(selected), 1) if selected else 0.0
    print(f"\n[verify] HLS: {passed}/{len(selected)} passed ({pass_rate}%)\n", flush=True)

    return {
        "checked": len(selected),
        "passed": passed,
        "pass_rate_pct": pass_rate,
        "countries_sampled": len(sampled_countries),
        "details": details,
    }


# ======================================================================
# Inline verification — YouTube
# ======================================================================

def verify_youtube(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Pick ~5 YouTube streams; verify embed page returns HTTP 200."""
    yt_pool = [r for r in results
               if r.get("status") == "youtube" and r.get("token")]

    if not yt_pool:
        print("[verify] No YouTube streams found.", flush=True)
        return {"checked": 0, "passed": 0, "pass_rate": 0, "details": []}

    selected = random.sample(yt_pool, min(YT_VERIFY_COUNT, len(yt_pool)))

    print(f"\n[verify] Checking {len(selected)} YouTube embeds...\n", flush=True)

    details: List[Dict[str, Any]] = []
    passed = 0
    for r in selected:
        vid = r.get("token", "")
        embed_url = f"https://www.youtube.com/embed/{vid}"
        http_code = _curl_http_code(embed_url, timeout=10)
        ok = http_code == 200
        if ok:
            passed += 1

        details.append({
            "country": r["country"],
            "camera_name": r["camera_name"],
            "video_id": vid,
            "embed_url": embed_url,
            "http_code": http_code,
            "ok": ok,
        })
        icon = "PASS" if ok else "FAIL"
        print(f"  [{icon}] {r['country']}/{r['camera_name']}: HTTP {http_code}", flush=True)

    pass_rate = round(100 * passed / len(selected), 1) if selected else 0.0
    print(f"\n[verify] YouTube: {passed}/{len(selected)} passed ({pass_rate}%)\n", flush=True)

    return {
        "checked": len(selected),
        "passed": passed,
        "pass_rate_pct": pass_rate,
        "details": details,
    }


# ======================================================================
# main
# ======================================================================

def main() -> int:
    if not os.path.exists(INPUT_FILE):
        print(f"[FATAL] {INPUT_FILE} not found.", file=sys.stderr)
        return 1

    with open(INPUT_FILE, "r", encoding="utf-8") as fh:
        items: List[Dict[str, Any]] = json.load(fh)

    if not isinstance(items, list) or len(items) == 0:
        print("[FATAL] Input is not a non-empty JSON array.", file=sys.stderr)
        return 1

    print(f"[*] Loaded {len(items)} camera entries.", flush=True)

    # ------- Batch extraction -------
    t0 = time.time()
    results = run_batch(items)
    elapsed = time.time() - t0

    # ------- Statistics -------
    stats = compute_stats(results, elapsed)
    print_summary(stats)

    with open(OUTPUT_STATS, "w", encoding="utf-8") as fh:
        json.dump(stats, fh, indent=2, ensure_ascii=False)
    print(f"[✓] Statistics → {OUTPUT_STATS}", flush=True)

    # ------- Group & sort → webcams.json -------
    grouped = group_and_sort(results)
    with open(OUTPUT_WEBCAMS, "w", encoding="utf-8") as fh:
        json.dump(grouped, fh, indent=2, ensure_ascii=False)
    print(f"[✓] Grouped data → {OUTPUT_WEBCAMS}", flush=True)

    # ------- Inline verification -------
    print("\n" + "=" * 72)
    print("  INLINE VERIFICATION")
    print("=" * 72, flush=True)

    hls_report = verify_hls(results)
    yt_report = verify_youtube(results)

    verification = {
        "hls": hls_report,
        "youtube": yt_report,
        "verified_at": _now_iso(),
    }
    with open(OUTPUT_VERIFY, "w", encoding="utf-8") as fh:
        json.dump(verification, fh, indent=2, ensure_ascii=False)
    print(f"[✓] Verification → {OUTPUT_VERIFY}", flush=True)

    # ------- Done -------
    print("\n" + "=" * 72)
    print("  ALL DONE")
    print(f"  Elapsed   : {elapsed:.1f}s  ({stats['requests_per_second']} req/s)")
    print(f"  Webcams   : {OUTPUT_WEBCAMS}")
    print(f"  Stats     : {OUTPUT_STATS}")
    print(f"  Verify    : {OUTPUT_VERIFY}")
    print("=" * 72)

    return 0


if __name__ == "__main__":
    sys.exit(main())
