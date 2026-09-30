#!/usr/bin/env bash
# Mac bridge: orchestrator API (:5174) + public tunnel so Vercel can Start/Stop/Open/Test/Sync.
#
# Preferred path (stable, avoids trycloudflare 429 / 1015):
#   1. cloudflared tunnel login
#   2. ./scripts/mac-bridge-named-setup.sh yourdomain.com
#   3. npm run mac-bridge
#
# Fallback: ephemeral Cloudflare quick tunnel, then localhost.run.
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
NAMED_CONFIG="${HOME}/.cloudflared/kingdom-api-config.yml"
CERT="${HOME}/.cloudflared/cert.pem"

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

# Resolve API_BASE from named config hostname when .env omits KINGDOM_API_BASE
api_base_from_named_config() {
  local cfg="$1"
  python3 - "$cfg" <<'PY'
import re, sys
from pathlib import Path
text = Path(sys.argv[1]).read_text()
m = re.search(r"(?m)^\s*-\s*hostname:\s*(\S+)\s*$", text)
if m:
  print("https://" + m.group(1).strip().strip("\"'"))
PY
}

print_named_help() {
  echo
  echo "Named tunnel (recommended — avoids Cloudflare quick-tunnel rate limits):"
  if [[ ! -f "$CERT" ]]; then
    echo "  1. cloudflared tunnel login"
    echo "  2. ./scripts/mac-bridge-named-setup.sh yourdomain.com"
  else
    echo "  ./scripts/mac-bridge-named-setup.sh yourdomain.com"
  fi
  echo "  npm run mac-bridge"
  echo
}

API_BASE=""
TUNNEL_MODE=""

if [[ -f "$NAMED_CONFIG" ]]; then
  echo "Using named tunnel: $NAMED_CONFIG"
  cloudflared tunnel --config "$NAMED_CONFIG" run >"$TUNNEL_LOG" 2>&1 &
  echo $! >"$PID_DIR/tunnel.pid"
  TUNNEL_MODE="named"
  API_BASE="${KINGDOM_API_BASE:-}"
  if [[ -z "$API_BASE" ]]; then
    API_BASE="$(api_base_from_named_config "$NAMED_CONFIG" || true)"
  fi
  if [[ -z "$API_BASE" ]]; then
    echo "Named tunnel is running but no public URL known."
    echo "  Set KINGDOM_API_BASE in .env (https://api.yourdomain.com)"
    echo "  Or re-run: ./scripts/mac-bridge-named-setup.sh yourdomain.com"
    echo "Waiting (Ctrl+C to stop)…"
    wait
    exit 0
  fi
  # brief readiness: config process alive
  sleep 1
  if ! kill -0 "$(cat "$PID_DIR/tunnel.pid")" 2>/dev/null; then
    echo "Named tunnel exited immediately. Log:"
    tail -40 "$TUNNEL_LOG" || true
    if [[ ! -f "$CERT" ]]; then
      echo
      echo "Login required:"
      echo "  cloudflared tunnel login"
    fi
    exit 1
  fi
else
  echo "No named config at $NAMED_CONFIG — using ephemeral tunnel (may hit 429)."
  print_named_help
  echo "Starting ephemeral Cloudflare quick tunnel → :$API_PORT …"
  : >"$TUNNEL_LOG"
  # Allocate a pseudo-TTY so cloudflared line-buffers the quick-tunnel URL
  if command -v script >/dev/null 2>&1; then
    script -q "$TUNNEL_LOG" cloudflared tunnel --url "http://127.0.0.1:$API_PORT" --no-autoupdate >/dev/null 2>&1 &
  else
    cloudflared tunnel --url "http://127.0.0.1:$API_PORT" --no-autoupdate >>"$TUNNEL_LOG" 2>&1 &
  fi
  echo $! >"$PID_DIR/tunnel.pid"
  CF_FAIL=""
  for i in $(seq 1 90); do
    if ! kill -0 "$(cat "$PID_DIR/tunnel.pid")" 2>/dev/null; then
      CF_FAIL="exited"
      break
    fi
    API_BASE=$(
      tr -d '\r' <"$TUNNEL_LOG" 2>/dev/null \
        | sed 's/\x1b\[[0-9;]*m//g' \
        | grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' \
        | head -1 || true
    )
    if [[ -n "$API_BASE" ]]; then
      break
    fi
    if grep -qE '429|error code: 1015|Too Many Requests' "$TUNNEL_LOG" 2>/dev/null; then
      CF_FAIL="rate_limited"
      break
    fi
    sleep 1
  done

  if [[ -n "$API_BASE" ]]; then
    TUNNEL_MODE="quick"
  else
    kill "$(cat "$PID_DIR/tunnel.pid")" 2>/dev/null || true
    rm -f "$PID_DIR/tunnel.pid"
    echo
    if [[ "$CF_FAIL" == "rate_limited" ]]; then
      echo "Cloudflare quick tunnel rate-limited (429 / 1015)."
      print_named_help
      echo "Falling back to localhost.run (SSH reverse tunnel)…"
    else
      echo "Cloudflare quick tunnel did not yield a URL ($CF_FAIL). Log:"
      tail -40 "$TUNNEL_LOG" || true
      print_named_help
      echo "Falling back to localhost.run…"
    fi
    : >"$TUNNEL_LOG"
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes \
      -R 80:127.0.0.1:"$API_PORT" nokey@localhost.run >>"$TUNNEL_LOG" 2>&1 &
    echo $! >"$PID_DIR/tunnel.pid"
    for i in $(seq 1 45); do
      if ! kill -0 "$(cat "$PID_DIR/tunnel.pid")" 2>/dev/null; then
        echo "localhost.run exited. Log:"
        tail -40 "$TUNNEL_LOG" || true
        print_named_help
        exit 1
      fi
      API_BASE=$(
        grep -Eo 'https://[a-zA-Z0-9.-]+\.(localhost\.run|lhr\.life)' "$TUNNEL_LOG" 2>/dev/null \
          | head -1 || true
      )
      if [[ -n "$API_BASE" ]]; then
        break
      fi
      sleep 1
    done
    if [[ -z "$API_BASE" ]]; then
      echo "Could not start a public tunnel."
      print_named_help
      echo "  • Or wait ~2 minutes for Cloudflare rate limit, then: npm run mac-bridge"
      tail -40 "$TUNNEL_LOG" || true
      exit 1
    fi
    TUNNEL_MODE="localhost.run"
  fi
fi

mkdir -p "$(dirname "$BRIDGE_JSON")"
python3 - <<PY
import json
from pathlib import Path
Path("$BRIDGE_JSON").write_text(json.dumps({
  "api_base": "$API_BASE",
  "tunnel_mode": "$TUNNEL_MODE",
  "updated_at": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
  "note": "Mac bridge for Vercel Throne controls. Token stays in env / browser localStorage — not here.",
}, indent=2) + "\n")
PY

echo
echo "════════════════════════════════════════════════════════"
echo "  Mac bridge UP  ($TUNNEL_MODE)"
echo "  API base:  $API_BASE"
echo "  Token:     (from .env KINGDOM_CONTROL_TOKEN)"
echo
echo "  Vercel env (or paste once in Throne → Connect Mac):"
echo "    VITE_KINGDOM_API_BASE=$API_BASE"
echo "    VITE_KINGDOM_CONTROL_TOKEN=<same as .env>"
echo
if [[ "$TUNNEL_MODE" != "named" ]]; then
  echo "  Tip: named tunnel avoids rate limits — see scripts/mac-bridge-named-setup.sh"
  echo
fi
echo "  Keep this terminal open. Ctrl+C stops the bridge."
echo "════════════════════════════════════════════════════════"
echo

wait
