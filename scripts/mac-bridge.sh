#!/usr/bin/env bash
# Mac bridge: orchestrator API (:5174) + Cloudflare tunnel so Vercel can Start/Stop/Open/Test/Sync.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load .env into this shell (token for child processes)
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env" 2>/dev/null || true
  set +a
fi

if [[ -z "${KINGDOM_CONTROL_TOKEN:-}" ]]; then
  echo "Missing KINGDOM_CONTROL_TOKEN in .env"
  echo "  echo \"KINGDOM_CONTROL_TOKEN=\$(openssl rand -hex 16)\" >> .env"
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install: brew install cloudflared"
  exit 1
fi

API_PORT="${ORCHESTRATOR_API_PORT:-5174}"
PID_DIR="${TMPDIR:-/tmp}/kingdom-bridge"
mkdir -p "$PID_DIR"
API_LOG="$PID_DIR/api.log"
TUNNEL_LOG="$PID_DIR/tunnel.log"
BRIDGE_JSON="$ROOT/public/data/mac-bridge.json"

cleanup() {
  if [[ -f "$PID_DIR/api.pid" ]]; then
    kill "$(cat "$PID_DIR/api.pid")" 2>/dev/null || true
    rm -f "$PID_DIR/api.pid"
  fi
  if [[ -f "$PID_DIR/tunnel.pid" ]]; then
    kill "$(cat "$PID_DIR/tunnel.pid")" 2>/dev/null || true
    rm -f "$PID_DIR/tunnel.pid"
  fi
}
trap cleanup EXIT INT TERM

echo "Starting orchestrator API on :$API_PORT …"
node "$ROOT/scripts/orchestrator-api.mjs" >"$API_LOG" 2>&1 &
echo $! >"$PID_DIR/api.pid"

for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$API_PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
if ! curl -sf "http://127.0.0.1:$API_PORT/api/health" >/dev/null 2>&1; then
  echo "API failed to start. Log:"
  tail -40 "$API_LOG" || true
  exit 1
fi

NAMED_CONFIG="${HOME}/.cloudflared/kingdom-api-config.yml"
if [[ -f "$NAMED_CONFIG" ]]; then
  echo "Using named tunnel config: $NAMED_CONFIG"
  cloudflared tunnel --config "$NAMED_CONFIG" run >"$TUNNEL_LOG" 2>&1 &
  echo $! >"$PID_DIR/tunnel.pid"
  API_BASE="${KINGDOM_API_BASE:-}"
  if [[ -z "$API_BASE" ]]; then
    echo "Set KINGDOM_API_BASE in .env to your stable api hostname (https://api.…)."
    echo "Tunnel is running; waiting (Ctrl+C to stop)."
    wait
    exit 0
  fi
else
  echo "Starting ephemeral Cloudflare tunnel → :$API_PORT …"
  cloudflared tunnel --url "http://127.0.0.1:$API_PORT" --no-autoupdate >"$TUNNEL_LOG" 2>&1 &
  echo $! >"$PID_DIR/tunnel.pid"
  API_BASE=""
  for i in $(seq 1 60); do
    API_BASE=$(grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
    if [[ -n "$API_BASE" ]]; then
      break
    fi
    sleep 0.5
  done
  if [[ -z "$API_BASE" ]]; then
    echo "Could not parse tunnel URL. Log:"
    tail -40 "$TUNNEL_LOG" || true
    exit 1
  fi
fi

mkdir -p "$(dirname "$BRIDGE_JSON")"
python3 - <<PY
import json
from pathlib import Path
Path("$BRIDGE_JSON").write_text(json.dumps({
  "api_base": "$API_BASE",
  "updated_at": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
  "note": "Mac bridge for Vercel Throne controls. Token stays in env / browser localStorage — not here.",
}, indent=2) + "\n")
PY

echo
echo "════════════════════════════════════════════════════════"
echo "  Mac bridge UP"
echo "  API base:  $API_BASE"
echo "  Token:     (from .env KINGDOM_CONTROL_TOKEN)"
echo
echo "  Vercel env (or paste once in Throne → Connect Mac):"
echo "    VITE_KINGDOM_API_BASE=$API_BASE"
echo "    VITE_KINGDOM_CONTROL_TOKEN=<same as .env>"
echo
echo "  Keep this terminal open. Ctrl+C stops the bridge."
echo "════════════════════════════════════════════════════════"
echo

wait
