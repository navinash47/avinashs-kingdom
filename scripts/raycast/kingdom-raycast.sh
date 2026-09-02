#!/usr/bin/env bash
# Raycast script commands for Kingdom orchestrator.
# Install: copy to ~/Documents/Raycast/Scripts/ or import as Script Commands.
set -euo pipefail

KINGDOM_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API="${ORCHESTRATOR_API:-http://127.0.0.1:5174/api}"

service_for_venture() {
  node -e "
    const s=require('$KINGDOM_ROOT/config/dashboard-services.json');
    const v=process.argv[1];
    const e=Object.entries(s.services).find(([,x])=>x.ventureId===v);
    if(!e){process.exit(1)}
    console.log(e[0]);
  " "$1"
}

case "${1:-}" in
  sync)
    curl -sf -X POST "$API/sync" >/dev/null && echo "Kingdom synced" || (cd "$KINGDOM_ROOT" && npm run sync)
    ;;
  open-venture)
    VENTURE="${2:?venture id required}"
    TAB="${3:-run}"
    cd "$KINGDOM_ROOT" && node scripts/orchestrator-open.mjs --venture "$VENTURE" --tab "$TAB"
    ;;
  open-dashboard)
    VENTURE="${2:?venture id required}"
    cd "$KINGDOM_ROOT" && node scripts/orchestrator-open.mjs --venture "$VENTURE" --tab run
    ;;
  start-dashboard)
    VENTURE="${2:?venture id required}"
    SVC="$(service_for_venture "$VENTURE")"
    curl -sf -X POST "$API/services/$SVC/start" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.service.status.toUpperCase(), j.service.url)})"
    ;;
  stop-dashboard)
    VENTURE="${2:?venture id required}"
    SVC="$(service_for_venture "$VENTURE")"
    curl -sf -X POST "$API/services/$SVC/stop" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Stopped', j.service.name)})"
    ;;
  open-repo)
    VENTURE="${2:?venture id required}"
    REG="$KINGDOM_ROOT/public/data/venture-registry.json"
    REPO=$(node -e "
      const r=require('$REG');
      const v=r.ventures.find(x=>x.id==='$VENTURE');
      if(!v?.repoPath){process.exit(1)}
      console.log(v.repoPath.replace(/^~/, process.env.HOME));
    ")
    cursor "$REPO" 2>/dev/null || open "$REPO"
    ;;
  run-tests)
    VENTURE="${2:?venture id required}"
    curl -sf -X POST "$API/ventures/$VENTURE/test" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.ok?'PASS':'FAIL', j.venture_id||'');process.exit(j.ok?0:1)})" \
      || (cd "$KINGDOM_ROOT" && npm run test:venture -- --venture "$VENTURE")
    ;;
  *)
    echo "Usage: kingdom-raycast.sh {sync|open-venture|open-dashboard|start-dashboard|stop-dashboard|open-repo|run-tests} [args]"
    exit 1
    ;;
esac
