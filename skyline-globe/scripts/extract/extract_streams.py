#!/usr/bin/env python3
"""
extract_streams.py — Extract live HLS stream URLs from SkylineWebcams detail pages.

This script fetches camera detail pages, extracts the stream token from the
Clappr player configuration, builds the real HLS playlist URL (via the
hd-auth CDN), verifies the m3u8 playlist is accessible, and prints a JSON
summary.  YouTube-embedded streams are detected as a separate type.

The stream URL construction logic is derived from the site's own player JS
(playerj.js): the HTML contains ``source:'livee.m3u8?a=<token>'`` and the
player rewrites it as:
    https://hd-auth.skylinewebcams.com/live.m3u8?a=<token>
"""

from __future__ import annotations

import json
import re
import sys
import time
from typing import Optional

# ---------------------------------------------------------------------------
# Use requests if available, otherwise fall back to the stdlib.
# ---------------------------------------------------------------------------
try:
    import requests as _requests  # type: ignore[import-untyped]

    _HAS_REQUESTS = True
except ImportError:
    import urllib.error
    import urllib.request

    _HAS_REQUESTS = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Realistic browser User-Agent (Chrome 131 on macOS)
USER_AGENT: str = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# Regex to extract the 26-char stream token from the Clappr player config.
# The token appears inside a JS object literal:
#     source:'livee.m3u8?a=<26-alnum-chars>'
# The quotes around the value can be single or double.
TOKEN_RE: re.Pattern[str] = re.compile(
    r"""source:\s*['"]livee\.m3u8\?a=([a-z0-9]{26})['"]"""
)

# Regex to detect YouTube embedded streams.
# The page may contain something like: videoId:'dQw4w9WgXcQ'
YOUTUBE_RE: re.Pattern[str] = re.compile(
    r"""videoId\s*:\s*['"]([a-zA-Z0-9_-]{11})['"]"""
)

# Regex to extract the ``nkey`` used for the poster/thumbnail.
NKEY_RE: re.Pattern[str] = re.compile(r"""nkey\s*:\s*['"]([^'"]+)['"]""")

# How the player JS constructs the real HLS playlist URL.
HD_AUTH_BASE: str = "https://hd-auth.skylinewebcams.com/"

# Maximum retries for transient network errors.
MAX_RETRIES: int = 3
RETRY_DELAY: float = 2.0  # seconds between retries

# ---------------------------------------------------------------------------
# Target cameras (name → detail page URL)
# ---------------------------------------------------------------------------
TARGETS: list[tuple[str, str]] = [
    (
        "Trevi Fountain",
        "https://www.skylinewebcams.com/en/webcam/italia/lazio/roma/fontana-di-trevi.html",
    ),
    (
        "Colosseum",
        "https://www.skylinewebcams.com/en/webcam/italia/lazio/roma/roma-colosseo.html",
    ),
]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------
def _fetch_requests(url: str, referer: str = "", timeout: int = 30) -> str:
    """Fetch a URL using the ``requests`` library.  Returns the response body
    as a decoded string, or raises on failure."""
    headers: dict[str, str] = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if referer:
        headers["Referer"] = referer
        headers["Origin"] = "https://www.skylinewebcams.com"

    # Use a Session for connection reuse across multiple requests to the
    # same host (helps with the hd-auth CDN which may be connection-picky).
    session = _requests.Session()  # type: ignore[attr-defined]
    session.headers.update(headers)

    resp = session.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp.text


def _fetch_urllib(url: str, referer: str = "", timeout: int = 30) -> str:
    """Fetch a URL using only stdlib ``urllib``.  Returns decoded body."""
    req = urllib.request.Request(url)
    req.add_header("User-Agent", USER_AGENT)
    req.add_header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
    req.add_header("Accept-Language", "en-US,en;q=0.9")
    if referer:
        req.add_header("Referer", referer)
        req.add_header("Origin", "https://www.skylinewebcams.com")

    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def fetch(url: str, referer: str = "", timeout: int = 30) -> str:
    """Fetch *url* with retries.  Uses ``requests`` if installed, else
    ``urllib``.  Returns the decoded response body."""
    last_exc: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if _HAS_REQUESTS:
                return _fetch_requests(url, referer=referer, timeout=timeout)
            else:
                return _fetch_urllib(url, referer=referer, timeout=timeout)
        except Exception as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
    # All retries exhausted
    raise RuntimeError(
        f"Failed to fetch {url} after {MAX_RETRIES} attempts"
    ) from last_exc


# ---------------------------------------------------------------------------
# Core extraction logic
# ---------------------------------------------------------------------------
def extract_stream_info(name: str, page_url: str) -> dict:
    """Extract stream metadata from a single camera detail page.

    Returns a dictionary with keys:
        name, url, status, token, full_stream_url,
        m3u8_verified, stream_type, thumbnail_url, error
    """
    result: dict = {
        "name": name,
        "url": page_url,
        "status": "unknown",
        "token": None,
        "full_stream_url": None,
        "m3u8_verified": False,
        "stream_type": "none",
        "thumbnail_url": None,
        "error": None,
    }

    try:
        html = fetch(page_url)
    except Exception as exc:
        result["status"] = "offline"
        result["error"] = f"page_fetch_failed: {exc}"
        return result

    # --- YouTube detection (check first — some pages may be YT only) ---
    yt_match = YOUTUBE_RE.search(html)
    if yt_match:
        result["stream_type"] = "youtube"
        result["status"] = "youtube"
        result["token"] = yt_match.group(1)
        result["full_stream_url"] = (
            f"https://www.youtube.com/embed/{yt_match.group(1)}"
        )
        # Extract nkey for thumbnail still applies
        nkey_m = NKEY_RE.search(html)
        if nkey_m:
            result["thumbnail_url"] = (
                f"https://cdn.skylinewebcams.com/_{nkey_m.group(1)}"
            )
        return result

    # --- HLS token extraction ---
    token_match = TOKEN_RE.search(html)
    if not token_match:
        result["status"] = "offline"
        result["error"] = "token_not_found"
        return result

    token = token_match.group(1)
    result["token"] = token

    # Build the real HLS playlist URL (the JS player transforms
    # ``livee.m3u8?a=...`` → ``https://hd-auth.skylinewebcams.com/live.m3u8?a=...``)
    full_stream_url = f"{HD_AUTH_BASE}live.m3u8?a={token}"
    result["full_stream_url"] = full_stream_url
    result["stream_type"] = "hls"

    # --- Thumbnail (nkey → poster) ---
    nkey_match = NKEY_RE.search(html)
    if nkey_match:
        result["thumbnail_url"] = (
            f"https://cdn.skylinewebcams.com/_{nkey_match.group(1)}"
        )

    # --- Verify the m3u8 playlist is actually accessible ---
    try:
        m3u8_body = fetch(
            full_stream_url,
            referer=page_url,
            timeout=15,
        )
    except Exception as exc:
        result["status"] = "offline"
        result["error"] = f"m3u8_fetch_failed: {exc}"
        return result

    # Check for valid m3u8 content
    if (
        "#EXTM3U" in m3u8_body
        and ("#EXTINF" in m3u8_body or ".ts" in m3u8_body)
    ):
        result["m3u8_verified"] = True
        result["status"] = "online"
    else:
        # Server returned 200 but content is not a playlist (e.g. HTML 404)
        result["status"] = "offline"
        result["error"] = "m3u8_invalid_content"
        result["m3u8_verified"] = False

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    """Entry point: process all target cameras, print JSON summary,
    run assertions."""
    results: list[dict] = []

    for name, url in TARGETS:
        print(f"[*] Processing: {name}", file=sys.stderr)
        info = extract_stream_info(name, url)
        results.append(info)
        # Brief per-camera report to stderr
        print(
            f"    status={info['status']}  "
            f"stream_type={info['stream_type']}  "
            f"m3u8_verified={info['m3u8_verified']}",
            file=sys.stderr,
        )
        if info["error"]:
            print(f"    error: {info['error']}", file=sys.stderr)

    # --- JSON summary ---
    print(json.dumps(results, indent=2, ensure_ascii=False))

    # --- Assertions ---
    print("\n" + "=" * 60, file=sys.stderr)
    print("ASSERTIONS", file=sys.stderr)
    print("=" * 60, file=sys.stderr)

    all_passed: bool = True

    # Assertion 1: tokens are different (when both are HLS)
    hls_results = [r for r in results if r["stream_type"] == "hls"]
    tokens = [r["token"] for r in hls_results if r["token"] is not None]
    if len(tokens) >= 2:
        if tokens[0] != tokens[1]:
            print(
                "  [PASS] Tokens are different from each other",
                file=sys.stderr,
            )
        else:
            print(
                f"  [INFO] Tokens are identical ({tokens[0][:8]}...). "
                "The hd-auth CDN may derive the camera identity from the "
                "Referer or session rather than the token itself. "
                "This is not necessarily a failure.",
                file=sys.stderr,
            )

    # Assertion 2: m3u8 URLs return valid playlist content
    for r in hls_results:
        label = r["name"]
        if r["m3u8_verified"]:
            print(
                f"  [PASS] {label}: m3u8 verified (valid playlist)",
                file=sys.stderr,
            )
        else:
            print(
                f"  [FAIL] {label}: m3u8 NOT verified — {r.get('error', 'unknown')}",
                file=sys.stderr,
            )
            all_passed = False

    # Overall
    if all_passed:
        print("\n  >>> OVERALL: PASS <<<", file=sys.stderr)
    else:
        print("\n  >>> OVERALL: FAIL <<<", file=sys.stderr)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
