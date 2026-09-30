#!/usr/bin/env bash
# One-shot named Cloudflare tunnel for Kingdom mac-bridge (orchestrator API :5174).
#
# Prefer this over trycloudflare.com quick tunnels (those hit 429 / error 1015).
#
# One-time:
#   1. cloudflared tunnel login          # browser; authorize a zone you own
#   2. ./scripts/mac-bridge-named-setup.sh yourdomain.com
# Daily:
#   npm run mac-bridge
#
# Stable URL: https://api.<domain>  (override host with KINGDOM_API_HOSTNAME)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF_DIR="$HOME/.cloudflared"
NAME="${KINGDOM_API_TUNNEL_NAME:-kingdom-api}"
DOMAIN="${1:-}"
HOST_LABEL="${KINGDOM_API_HOSTNAME:-api}"
CONFIG="$CF_DIR/kingdom-api-config.yml"
API_PORT="${ORCHESTRATOR_API_PORT:-5174}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <your-cloudflare-domain>"
  echo "Example: $0 example.com"
  echo
  echo "Creates tunnel '$NAME' and DNS:"
  echo "  ${HOST_LABEL}.<domain>  →  http://127.0.0.1:${API_PORT}"
  echo
  echo "Writes: $CONFIG"
  echo "Sets:   KINGDOM_API_BASE in repo .env (URL only)"
  echo
  echo "Prereq: cloudflared tunnel login"
  echo "Note:   No domain is stored yet (kingdom-config.yml missing)."
  echo "        Use any zone attached to the Cloudflare account you authorize."
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install: brew install cloudflared"
  exit 1
fi

if [[ ! -f "$CF_DIR/cert.pem" ]]; then
  echo "Not logged in to Cloudflare (missing ~/.cloudflared/cert.pem)."
  echo "Run this first (opens browser — pick the zone for $DOMAIN):"
  echo "  cloudflared tunnel login"
  exit 1
fi

mkdir -p "$CF_DIR"
HOSTNAME="${HOST_LABEL}.${DOMAIN}"

if ! cloudflared tunnel list 2>/dev/null | grep -qw "$NAME"; then
  echo "Creating tunnel: $NAME"
  cloudflared tunnel create "$NAME"
else
  echo "Tunnel already exists: $NAME"
fi

UUID=$(cloudflared tunnel list --output json | python3 -c "
import json,sys
for t in json.load(sys.stdin):
  if t.get('name')=='$NAME':
    print(t['id']); break
")
if [[ -z "$UUID" ]]; then
  echo "Could not resolve tunnel UUID for $NAME" >&2
  exit 1
fi

CREDS="$CF_DIR/${UUID}.json"
if [[ ! -f "$CREDS" ]]; then
  echo "Missing credentials $CREDS" >&2
  echo "Try: cloudflared tunnel delete $NAME && re-run this script" >&2
  exit 1
fi

cat >"$CONFIG" <<YAML
# Kingdom mac-bridge — orchestrator API (do not commit; lives in ~/.cloudflared)
tunnel: $UUID
credentials-file: $CREDS

ingress:
  - hostname: $HOSTNAME
    service: http://127.0.0.1:$API_PORT
  - service: http_status:404
YAML

echo "Wrote $CONFIG"

echo "DNS: $HOSTNAME → tunnel $NAME"
cloudflared tunnel route dns "$NAME" "$HOSTNAME" || true

API_BASE="https://$HOSTNAME"
ENV_FILE="$ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  if grep -qE '^[[:space:]]*KINGDOM_API_BASE=' "$ENV_FILE"; then
    python3 - <<PY
from pathlib import Path
p = Path("$ENV_FILE")
lines = p.read_text().splitlines(True)
out = []
for line in lines:
  if line.lstrip().startswith("KINGDOM_API_BASE="):
    out.append("KINGDOM_API_BASE=$API_BASE\n")
  else:
    out.append(line)
p.write_text("".join(out))
PY
    echo "Updated KINGDOM_API_BASE in .env → $API_BASE"
  else
    printf '\n# Named mac-bridge API (stable Cloudflare hostname)\nKINGDOM_API_BASE=%s\n' "$API_BASE" >>"$ENV_FILE"
    echo "Appended KINGDOM_API_BASE to .env → $API_BASE"
  fi
else
  printf '# Named mac-bridge API (stable Cloudflare hostname)\nKINGDOM_API_BASE=%s\n' "$API_BASE" >"$ENV_FILE"
  echo "Created .env with KINGDOM_API_BASE → $API_BASE"
  echo "Add KINGDOM_CONTROL_TOKEN separately if missing."
fi

BRIDGE_HINT="$ROOT/public/data/mac-bridge.json"
mkdir -p "$(dirname "$BRIDGE_HINT")"
python3 - <<PY
import json
from pathlib import Path
Path("$BRIDGE_HINT").write_text(json.dumps({
  "api_base": "$API_BASE",
  "updated_at": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
  "note": "Named tunnel setup. Run npm run mac-bridge to serve API + tunnel.",
  "permanent": True,
}, indent=2) + "\n")
PY

echo
echo "========================================"
echo "Mac-bridge named tunnel ready"
echo "  Hostname:  https://$HOSTNAME"
echo "  Config:    $CONFIG"
echo "  Tunnel:    $NAME ($UUID)"
echo
echo "Next:"
echo "  npm run mac-bridge"
echo
echo "Vercel / Throne:"
echo "  VITE_KINGDOM_API_BASE=$API_BASE"
echo "  VITE_KINGDOM_CONTROL_TOKEN=<same as local .env>"
echo "========================================"
