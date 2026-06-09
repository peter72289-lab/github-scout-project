#!/usr/bin/env python3
"""Local GitHubScout Commerce storefront scan API."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


USER_AGENT = "GitHubScout-Commerce/1.0"
MAX_BYTES = 900_000


def normalized_url(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Missing URL")
    if not re.match(r"^https?://", value, re.I):
        value = "https://" + value
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Use a valid http or https storefront URL")
    return value


def fetch_storefront(url: str) -> dict:
    request = urllib.request.Request(
        normalized_url(url),
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(request, timeout=18) as response:
        body = response.read(MAX_BYTES + 1)
        truncated = len(body) > MAX_BYTES
        if truncated:
            body = body[:MAX_BYTES]
        charset = response.headers.get_content_charset() or "utf-8"
        html = body.decode(charset, errors="replace")
        return {
            "ok": True,
            "url": response.geturl(),
            "status": response.status,
            "bytes": len(body),
            "truncated": truncated,
            "html": html,
        }


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self) -> None:
        self._send(200, {"ok": True})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path in {"/health", "/api/health"}:
            self._send(200, {"ok": True, "service": "githubscout-commerce-scan-api"})
            return
        if parsed.path not in {"/api/scan", "/scan"}:
            self._send(404, {"ok": False, "error": "Not found"})
            return
        params = dict(pair.split("=", 1) for pair in parsed.query.split("&") if "=" in pair)
        raw_url = urllib.parse.unquote_plus(params.get("url", ""))
        try:
            self._send(200, fetch_storefront(raw_url))
        except ValueError as exc:
            self._send(400, {"ok": False, "error": str(exc)})
        except urllib.error.HTTPError as exc:
            self._send(502, {"ok": False, "error": f"Storefront returned HTTP {exc.code}"})
        except (urllib.error.URLError, TimeoutError) as exc:
            self._send(502, {"ok": False, "error": str(exc)})

    def log_message(self, format: str, *args) -> None:
        print(f"[commerce-scan-api] {self.address_string()} - {format % args}")


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8767), Handler)
    print("GitHubScout Commerce scan API running at http://127.0.0.1:8767")
    server.serve_forever()


if __name__ == "__main__":
    main()
