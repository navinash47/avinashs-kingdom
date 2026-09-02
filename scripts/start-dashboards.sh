#!/usr/bin/env bash
# Start (or stop/status) local dashboards for Kingdom provinces.
# Service registry: config/dashboard-services.json
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI=(node "$ROOT/scripts/lib/dashboard-services-cli.mjs")
LOG_DIR="${TMPDIR:-/tmp}/kingdom-dashboards"
mkdir -p "$LOG_DIR"

port_open() {
  local port="$1"
  nc -z 127.0.0.1 "$port" >/dev/null 2>&1
}

lookup() {
  local want="$1"
  "${CLI[@]}" get "$want" 2>/dev/null || return 1
}

all_names() {
  "${CLI[@]}" list
}

status_one() {
  local name="$1"
  local meta pidfile st pid
  meta="$(lookup "$name" || true)"
  [[ -n "$meta" ]] || { echo "unknown $name"; return; }
  IFS='|' read -r port workdir cmd <<<"$meta"
  pidfile="$LOG_DIR/$name.pid"
  st="DOWN"
  pid="—"
  if port_open "$port"; then
    st="UP"
  fi
  if [[ -f "$pidfile" ]]; then
    pid=$(cat "$pidfile" 2>/dev/null || echo "?")
  fi
  printf "  %-10s :%-5s %-4s  pid=%s\n" "$name" "$port" "$st" "$pid"
  echo "    http://127.0.0.1:$port"
}

stop_one() {
  local name="$1"
  local meta pidfile pid port
  meta="$(lookup "$name" || true)"
  [[ -n "$meta" ]] || return 0
  IFS='|' read -r port _ <<<"$meta"
  pidfile="$LOG_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    pid=$(cat "$pidfile" || true)
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 0.3
      kill -9 "$pid" 2>/dev/null || true
      echo "[$name] stopped pid $pid"
    fi
    rm -f "$pidfile"
  fi
  if port_open "$port"; then
    echo "[$name] warning: :$port still in use (started outside this script?)"
  fi
}

start_one() {
  local name="$1"
  local meta port workdir cmd logfile pidfile
  meta="$(lookup "$name" || true)"
  if [[ -z "$meta" ]]; then
    echo "Unknown: $name" >&2
    return 1
  fi
  IFS='|' read -r port workdir cmd <<<"$meta"
  logfile="$LOG_DIR/$name.log"
  pidfile="$LOG_DIR/$name.pid"

  if [[ ! -d "$workdir" ]]; then
    echo "[$name] SKIP — missing dir $workdir"
    return 0
  fi

  if port_open "$port"; then
    echo "[$name] already UP on :$port → http://127.0.0.1:$port"
    return 0
  fi

  if [[ -f "$pidfile" ]]; then
    old=$(cat "$pidfile" || true)
    if [[ -n "${old:-}" ]] && ! kill -0 "$old" 2>/dev/null; then
      rm -f "$pidfile"
    fi
  fi

  echo "[$name] starting on :$port …"
  (
    cd "$workdir"
    START_CMD="$cmd" START_LOG="$logfile" START_PIDFILE="$pidfile" python3 - <<'PY'
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
    if port_open "$port"; then
      echo "[$name] UP → http://127.0.0.1:$port  (log: $logfile)"
      return 0
    fi
    sleep 0.4
  done

  echo "[$name] still starting / failed — check $logfile"
  tail -n 15 "$logfile" 2>/dev/null || true
}

MODE="start"
NAMES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status|-s) MODE="status"; shift ;;
    --stop) MODE="stop"; shift ;;
    --list|-l) MODE="list"; shift ;;
    --help|-h)
      echo "Usage: $0 [--status|--stop|--list] [names...]"
      echo "Names: $(all_names | tr '\n' ' ')"
      exit 0
      ;;
    *) NAMES+=("$1"); shift ;;
  esac
done

if [[ ${#NAMES[@]} -eq 0 ]]; then
  while IFS= read -r n; do NAMES+=("$n"); done < <(all_names)
fi

case "$MODE" in
  list)
    echo "Kingdom dashboards"
    for n in "${NAMES[@]}"; do status_one "$n"; done
    echo
    echo "Start:  ./scripts/start-dashboards.sh"
    echo "Stop:   ./scripts/start-dashboards.sh --stop"
    echo "Tunnel: npm run tunnels"
    ;;
  status)
    echo "Dashboard status"
    for n in "${NAMES[@]}"; do status_one "$n"; done
    ;;
  stop)
    echo "Stopping dashboards…"
    for n in "${NAMES[@]}"; do stop_one "$n"; done
    ;;
  start)
    echo "Starting dashboards…"
    for n in "${NAMES[@]}"; do start_one "$n"; done
    echo
    echo "Done. Status:"
    for n in "${NAMES[@]}"; do status_one "$n"; done
    echo
    echo "Public links next: npm run tunnels   (or say: cloudflare links)"
    ;;
esac
