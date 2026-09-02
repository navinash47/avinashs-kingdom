#!/usr/bin/env bash
# Share the full Kingdom orchestrator with a friend via one Cloudflare link.
# Starts all dashboards, syncs, tunnels EVERY service (real dashboard URLs in iframes).
#
# Usage: ./scripts/share-orchestrator.sh
#        npm run share
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TUNNEL_SCRIPT="$ROOT/scripts/cloudflare-dashboards.sh"
START_SCRIPT="$ROOT/scripts/start-dashboards.sh"
SHARE_JSON="$ROOT/public/data/share-url.json"
LOG_DIR="${TMPDIR:-/tmp}/kingdom-dashboards"

port_open() {
  nc -z 127.0.0.1 "$1" >/dev/null 2>&1
}

echo "Kingdom share mode"
echo "=================="
echo

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Install cloudflared first: brew install cloudflare/cloudflare/cloudflared" >&2
  exit 1
fi

echo "→ Syncing portfolio data…"
(cd "$ROOT" && npm run sync)

echo
echo "→ Starting ALL dashboards locally (including venture demos)…"
"$START_SCRIPT" 2>/dev/null || true

if ! port_open 5173; then
  echo
  echo "→ Kingdom UI not on :5173 — starting npm run dev…"
  logfile="$LOG_DIR/kingdom-ui.log"
  pidfile="$LOG_DIR/kingdom-ui.pid"
  (
    cd "$ROOT"
    START_CMD="npm run dev:share"
    START_LOG="$logfile"
    START_PIDFILE="$pidfile"
    python3 - <<'PY'
import os, subprocess
log = open(os.environ["START_LOG"], "w")
p = subprocess.Popen(
    ["/bin/bash", "-lc", os.environ["START_CMD"]],
    stdout=log,
    stderr=subprocess.STDOUT,
    stdin=subprocess.DEVNULL,
    start_new_session=True,
    close_fds=True,
    cwd=os.getcwd(),
)
open(os.environ["START_PIDFILE"], "w").write(str(p.pid))
PY
  )
  for _ in $(seq 1 40); do
    port_open 5173 && break
    sleep 0.5
  done
fi

if ! port_open 5173; then
  echo "ERROR: Kingdom dev server not reachable on :5173" >&2
  echo "Run 'npm run dev' in another terminal, then re-run npm run share" >&2
  exit 1
fi

echo
echo "→ Opening Cloudflare tunnels (kingdom + every demo — real dashboards in iframes)…"
echo "   This takes ~1–2 min (rate-limit spacing between tunnels)…"
"$TUNNEL_SCRIPT" --no-start 2>&1

PUBLIC_URL=""
if [[ -f "$SHARE_JSON" ]]; then
  PUBLIC_URL="$(python3 -c "import json; print(json.load(open('$SHARE_JSON')).get('url',''))" 2>/dev/null || true)"
fi

echo
echo "========================================"
if [[ -n "$PUBLIC_URL" ]]; then
  echo "Send your friend this ONE link:"
  echo "  $PUBLIC_URL"
  echo
  echo "They see the full orchestrator — each venture iframe loads the REAL dashboard"
  echo "(not a broken embed proxy). Read-only for them; you run Start/Sync locally."
else
  echo "Check brain/wiki/ops/cloudflare-links.md and public/data/share-url.json"
fi
echo
echo "Keep your Mac awake. Re-run: npm run share (after reboot or if links die)"
