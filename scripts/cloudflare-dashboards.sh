#!/usr/bin/env bash
# Start local dashboards (if needed) and generate Cloudflare quick-tunnel links.
# Requires: cloudflared
#
# Usage:
#   ./scripts/cloudflare-dashboards.sh              # start all + tunnel all
#   ./scripts/cloudflare-dashboards.sh kingdom city # start subset + tunnel subset
#   ./scripts/cloudflare-dashboards.sh --list
#   ./scripts/cloudflare-dashboards.sh --no-start   # tunnel only (skip start)
#
# Chat: "cloudflare links" / "tunnel dashboards"
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/brain/wiki/ops"
OUT_MD="$OUT_DIR/cloudflare-links.md"
LOG_DIR="${TMPDIR:-/tmp}/kingdom-tunnels"
START_SCRIPT="$ROOT/scripts/start-dashboards.sh"
mkdir -p "$LOG_DIR" "$OUT_DIR"

DO_START=1
LIST_ONLY=0
NAMES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list|-l)
      LIST_ONLY=1
      shift
      ;;
    --no-start)
      DO_START=0
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--no-start] [--list] [names...]"
      echo "Default: start all dashboards, then tunnel each one that is UP."
      exit 0
      ;;
    *)
      NAMES+=("$1")
      shift
      ;;
  esac
done

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install: brew install cloudflare/cloudflare/cloudflared" >&2
  exit 1
fi

# name|port|local_hint
ALL_SERVICES=(
  "kingdom|5173|cd ~/Projects/avinashs-kingdom && npm run sync && npm run dev"
  "city|8765|cd ~/ProceduralCity && python3 scripts/serve_dashboard.py"
  "comic|8770|cd ~/Desktop/ComicMainEngine && DASHBOARD_PORT=8770 PYTHONPATH=src python scripts/run_dashboard.py"
  "whatsapp|8787|cd ~/Projects/whatsapp-voice-agents && node demo/server.mjs"
  "jugaad|8790|cd ~/Projects/job-jugaad && npm run start"
  "subs|8741|cd ~/Projects/subscription-audit && source .venv/bin/activate && subaudit serve"
  "mac|8742|cd ~/Projects/mac-optimize-audit && python3 -m mac_optimize serve --port 8742"
)

port_open() {
  local port="$1"
  nc -z 127.0.0.1 "$port" >/dev/null 2>&1
}

log_has_rate_limit() {
  local f="$1"
  grep -Eq '429 Too Many Requests|error code: 1015|Too Many Requests' "$f" 2>/dev/null
}

extract_tunnel_url() {
  local f="$1"
  # Prefer real guest hostnames. cloudflared logs also mention api.trycloudflare.com —
  # matching that first produces a link that spins forever and never opens.
  grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$f" 2>/dev/null \
    | grep -Ev 'https://api\.trycloudflare\.com' \
    | head -1 || true
}

all_names() {
  for row in "${ALL_SERVICES[@]}"; do
    IFS='|' read -r name _ <<<"$row"
    echo "$name"
  done
}

list_services() {
  echo "Known dashboards (script auto-starts unless --no-start):"
  for row in "${ALL_SERVICES[@]}"; do
    IFS='|' read -r name port hint <<<"$row"
    local st="DOWN"
    port_open "$port" && st="UP"
    printf "  %-10s :%s  [%s]\n" "$name" "$port" "$st"
    echo "    start: $hint"
  done
  echo
  echo "Note: City defaults to 8765; Comic is mapped to 8770 here so both can run."
}

if [[ "$LIST_ONLY" -eq 1 ]]; then
  list_services
  exit 0
fi

if [[ ${#NAMES[@]} -eq 0 ]]; then
  while IFS= read -r n; do NAMES+=("$n"); done < <(all_names)
fi

lookup() {
  local want="$1"
  for row in "${ALL_SERVICES[@]}"; do
    IFS='|' read -r name port hint <<<"$row"
    if [[ "$name" == "$want" ]]; then
      echo "$port|$hint"
      return 0
    fi
  done
  return 1
}

# Always bring locals up first (unless --no-start)
if [[ "$DO_START" -eq 1 ]]; then
  echo "Starting dashboards first…"
  "$START_SCRIPT" "${NAMES[@]}"
  echo
fi

STAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
declare -a RESULTS=()

echo "Kingdom Cloudflare tunnels · $STAMP"
echo "----------------------------------------"

for name in "${NAMES[@]}"; do
  meta="$(lookup "$name" || true)"
  if [[ -z "$meta" ]]; then
    echo "Unknown: $name (try --list)" >&2
    continue
  fi
  IFS='|' read -r port hint <<<"$meta"
  if ! port_open "$port"; then
    echo "[$name] SKIP — nothing on :$port"
    echo "         start: $hint"
    RESULTS+=("$name|$port|DOWN|")
    continue
  fi

  # Kill prior tunnel for this name if we recorded a pid
  pidfile="$LOG_DIR/$name.pid"
  logfile="$LOG_DIR/$name.log"
  if [[ -f "$pidfile" ]]; then
    old=$(cat "$pidfile" || true)
    if [[ -n "${old:-}" ]] && kill -0 "$old" 2>/dev/null; then
      kill "$old" 2>/dev/null || true
      sleep 0.5
      kill -9 "$old" 2>/dev/null || true
    fi
  fi
  # also kill any orphan cloudflared aimed at this port
  pkill -f "cloudflared tunnel --url http://127.0.0.1:$port" 2>/dev/null || true
  sleep 1

  : >"$logfile"
  # Detach into a new session so Cursor/shell teardown cannot kill tunnels.
  # Retry on Cloudflare quick-tunnel 429 / error 1015.
  cpid=""
  url=""
  for attempt in 1 2 3 4 5 6 7 8; do
    cpid=$(
      CLOUDFLARED_BIN="$(command -v cloudflared)" \
      TUNNEL_URL="http://127.0.0.1:$port" \
      TUNNEL_LOG="$logfile" \
      python3 - <<'PY'
import os, subprocess
bin = os.environ["CLOUDFLARED_BIN"]
url = os.environ["TUNNEL_URL"]
log = os.environ["TUNNEL_LOG"]
# shell redirect + exec keeps the log fd on the daemon process
p = subprocess.Popen(
    f'exec "{bin}" tunnel --url "{url}" >"{log}" 2>&1',
    shell=True,
    stdin=subprocess.DEVNULL,
    start_new_session=True,
    close_fds=True,
)
print(p.pid)
PY
    )
    echo "$cpid" >"$pidfile"

    url=""
    rate_limited=0
    for _ in $(seq 1 50); do
      url="$(extract_tunnel_url "$logfile")"
      if [[ -n "$url" ]]; then
        break
      fi
      if log_has_rate_limit "$logfile"; then
        rate_limited=1
        kill "$cpid" 2>/dev/null || true
        break
      fi
      if ! kill -0 "$cpid" 2>/dev/null; then
        sleep 0.5
        url="$(extract_tunnel_url "$logfile")"
        if [[ -n "$url" ]]; then
          break
        fi
        if log_has_rate_limit "$logfile"; then
          rate_limited=1
        fi
        break
      fi
      sleep 0.4
    done

    if [[ -n "$url" ]]; then
      # Reject api.trycloudflare.com false positives from failed Post "…" log lines.
      if [[ "$url" == "https://api.trycloudflare.com" ]]; then
        url=""
      else
        break
      fi
    fi

    if [[ "$rate_limited" -eq 1 ]]; then
      wait_s=$((attempt * 60))
      echo "[$name] Cloudflare rate limit (429) — waiting ${wait_s}s (attempt $attempt/8)…"
      sleep "$wait_s"
      continue
    fi

    if [[ "$attempt" -lt 8 ]]; then
      echo "[$name] no URL yet (attempt $attempt/8) — retrying in 15s… (see $logfile)"
      tail -n 3 "$logfile" 2>/dev/null || true
      sleep 15
      continue
    fi

    echo "[$name] FAILED — cloudflared exited early (see $logfile)"
    RESULTS+=("$name|$port|FAIL|")
    url="__FAIL__"
    break
  done

  if [[ "$url" == "__FAIL__" ]]; then
    continue
  fi

  if [[ -z "$url" ]]; then
    echo "[$name] FAILED — no URL after retries (see $logfile)"
    RESULTS+=("$name|$port|FAIL|")
    continue
  fi

  # Space out tunnel creates to avoid Cloudflare 429s
  sleep 8

  host="${url#https://}"
  # Wait for DNS via DoH (IP literal). Never dig/curl the hostname through the
  # system resolver first — that can NXDOMAIN-poison for ~30 minutes.
  ready=0
  resolve_ip=""
  for _ in $(seq 1 60); do
    if ! kill -0 "$cpid" 2>/dev/null; then
      break
    fi
    doh_json=$(curl -s -m 5 -H 'accept: application/dns-json' \
      "https://1.1.1.1/dns-query?name=${host}&type=A" || true)
    resolve_ip=$(python3 -c 'import json,sys
try:
  j=json.loads(sys.argv[1])
  ans=j.get("Answer") or []
  ips=[a["data"] for a in ans if a.get("type")==1]
  print(ips[0] if ips else "")
except Exception:
  print("")
' "$doh_json")
    if [[ -n "$resolve_ip" ]]; then
      probe_url="$url"
      [[ "$name" == "whatsapp" ]] && probe_url="${url%/}/health"
      code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 \
        --resolve "${host}:443:${resolve_ip}" "$probe_url" || true)
      if [[ "$code" =~ ^[0-9]+$ ]] && [[ "$code" != "000" && "$code" != "530" && "$code" != "502" && "$code" != "503" ]]; then
        ready=1
        break
      fi
    fi
    sleep 1
  done

  # Best-effort flush of local negative cache so browsers can resolve the name
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true

  if [[ "$ready" -ne 1 ]]; then
    echo "[$name] WARN — tunnel process up but DNS/HTTP not ready yet"
    echo "         public $url  (pid=$cpid) — try in ~30s; avoid early refresh if NXDOMAIN"
    RESULTS+=("$name|$port|PENDING|$url")
    continue
  fi

  if ! kill -0 "$cpid" 2>/dev/null; then
    echo "[$name] FAILED — cloudflared died after URL issued"
    RESULTS+=("$name|$port|FAIL|$url")
    continue
  fi

  echo "[$name] local http://127.0.0.1:$port"
  echo "         public $url"
  echo "         cloudflared pid $cpid (dns $resolve_ip)"
  RESULTS+=("$name|$port|UP|$url")
done

# Write brain page
{
  echo "---"
  echo "type: overview"
  echo "updated: ${STAMP:0:10}"
  echo "tags: [cloudflare, tunnels, dashboards]"
  echo "---"
  echo
  echo "# Cloudflare dashboard links"
  echo
  echo "Auto-generated by \`./scripts/cloudflare-dashboards.sh\` at **$STAMP**."
  echo
  echo "This script **starts locals first**, then opens detached quick tunnels."
  echo
  echo "Readiness uses Cloudflare DoH (not system DNS) so early NXDOMAIN probes do not poison the resolver for ~30 minutes."
  echo
  echo "Quick tunnels die on reboot or if you kill the cloudflared pid. Re-run for fresh URLs."
  echo
  echo "If a link shows NXDOMAIN in the browser, wait a minute or flush DNS (\`dscacheutil -flushcache\`) — do not hammer-refresh."
  echo
  echo "| Dashboard | Local | Status | Public URL |"
  echo "|-----------|-------|--------|------------|"
  for row in "${RESULTS[@]}"; do
    IFS='|' read -r name port st url <<<"$row"
    echo "| $name | \`:$port\` | $st | ${url:-—} |"
  done
  echo
  echo "## Commands"
  echo
  echo '```bash'
  echo "cd ~/Projects/avinashs-kingdom"
  echo "./scripts/cloudflare-dashboards.sh          # start all + tunnel all"
  echo "./scripts/cloudflare-dashboards.sh kingdom city comic"
  echo "npm run tunnels"
  echo '```'
  echo
} >"$OUT_MD"

# Share mode: one friend link + per-port tunnel URLs for real dashboard iframes
SHARE_JSON="$ROOT/public/data/share-url.json"
if [[ ${#RESULTS[@]} -gt 0 ]]; then
  node "$ROOT/scripts/write-share-url.mjs" "$STAMP" "$SHARE_JSON" "${RESULTS[@]}" 2>/dev/null || true
fi

echo "----------------------------------------"
echo "Wrote $OUT_MD"
echo "Stop a tunnel: kill \$(cat $LOG_DIR/<name>.pid)"
