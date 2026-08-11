#!/usr/bin/env bash
# Kingdom Headroom helpers — token compression proxy for Cursor BYOK / MCP.
set -euo pipefail

export PATH="${HOME}/.local/bin:${PATH}"
PORT="${HEADROOM_PORT:-8787}"
LOG="${HEADROOM_LOG:-/tmp/headroom-proxy.log}"
PIDFILE="${HEADROOM_PIDFILE:-/tmp/headroom-proxy.pid}"
PROJECT_SLUG="${HEADROOM_PROJECT:-avinashs-kingdom}"

cmd="${1:-status}"

have_headroom() {
  command -v headroom >/dev/null 2>&1
}

is_up() {
  curl -fsS -m 2 "http://127.0.0.1:${PORT}/livez" >/dev/null 2>&1
}

case "$cmd" in
  start)
    if ! have_headroom; then
      echo "headroom not found. Install: uv tool install --python 3.13 \"headroom-ai[all]\""
      exit 1
    fi
    if is_up; then
      echo "Headroom already up on :${PORT}"
      curl -fsS -m 2 "http://127.0.0.1:${PORT}/health" | head -c 200; echo
      exit 0
    fi
    # Clear stale pid
    if [[ -f "$PIDFILE" ]]; then
      old=$(cat "$PIDFILE" || true)
      if [[ -n "${old}" ]] && kill -0 "$old" 2>/dev/null; then
        echo "Process $old alive but not healthy — stop first"
        exit 1
      fi
      rm -f "$PIDFILE"
    fi
    nohup headroom proxy --port "$PORT" >"$LOG" 2>&1 &
    echo $! >"$PIDFILE"
    for i in 1 2 3 4 5 6 7 8 9 10; do
      if is_up; then
        echo "Headroom UP  http://127.0.0.1:${PORT}  pid=$(cat "$PIDFILE")"
        echo "Kingdom policy: keep Cursor Override Base URL on OmniRoute."
        echo "Use Headroom via MCP (compress/retrieve/stats), not Override Base URL."
        echo "Log: $LOG"
        exit 0
      fi
      sleep 1
    done
    echo "Failed to become healthy. Tail of $LOG:"
    tail -40 "$LOG" || true
    exit 1
    ;;
  stop)
    if [[ -f "$PIDFILE" ]]; then
      pid=$(cat "$PIDFILE")
      kill "$pid" 2>/dev/null || true
      rm -f "$PIDFILE"
      echo "Stopped pid $pid"
    fi
    # Also clear any stray listeners on the port
    if command -v lsof >/dev/null; then
      pids=$(lsof -t -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
      if [[ -n "${pids}" ]]; then
        kill $pids 2>/dev/null || true
        echo "Cleared listeners: $pids"
      fi
    fi
    ;;
  status|doctor)
    if have_headroom; then
      echo "CLI: $(command -v headroom) ($(headroom --version 2>/dev/null || echo unknown))"
    else
      echo "CLI: missing"
    fi
    if is_up; then
      echo "Proxy: UP :${PORT}"
      curl -fsS -m 3 "http://127.0.0.1:${PORT}/health" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(" status:", d.get("status"), "ready:", d.get("ready"), "ver:", d.get("version"))' 2>/dev/null || true
      curl -fsS -m 3 "http://127.0.0.1:${PORT}/stats" 2>/dev/null | head -c 400 || true
      echo
    else
      echo "Proxy: DOWN"
    fi
    echo "Cursor Override Base URL: leave as OmniRoute (do not point at Headroom)"
    echo "Cursor integration: MCP server 'headroom' only"
    ;;
  setup-print)
    echo "Kingdom Headroom setup (OmniRoute keeps Override Base URL):"
    echo "1) Keep Cursor Override OpenAI Base URL on OmniRoute (localhost:20128)"
    echo "2) MCP 'headroom' is in ~/.cursor/mcp.json — restart Cursor if tools missing"
    echo "3) Optional proxy for stats: npm run headroom:start"
    echo "4) Compress large tool/RAG dumps via MCP headroom_compress (not via Base URL)"
    echo "5) Optional stats: curl -s http://127.0.0.1:${PORT}/stats"
    ;;
  *)
    echo "Usage: $0 {start|stop|status|setup-print}"
    exit 2
    ;;
esac
