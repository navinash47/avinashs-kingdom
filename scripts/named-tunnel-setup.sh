#!/usr/bin/env bash
# Named Cloudflare tunnel — stable hostname for Kingdom (not trycloudflare.com).
#
# One-time:
#   1. cloudflared tunnel login          # opens browser, pick your zone
#   2. ./scripts/named-tunnel-setup.sh yourdomain.com
# Daily:
#   npm run share:named                  # or: ./scripts/named-tunnel-run.sh
#
# Friend always uses:  https://ops.yourdomain.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF_DIR="$HOME/.cloudflared"
NAME="${KINGDOM_TUNNEL_NAME:-kingdom-ops}"
DOMAIN="${1:-}"
CONFIG="$CF_DIR/kingdom-config.yml"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <your-cloudflare-domain>"
  echo "Example: $0 avinash.dev"
  echo
  echo "Creates tunnel '$NAME' and DNS:"
  echo "  ops.<domain>        → Kingdom :5173"
  echo "  city.<domain>       → :8765"
  echo "  comic.<domain>      → :8770"
  echo "  whatsapp.<domain>   → :8787"
  echo "  jugaad.<domain>     → :8790"
  echo "  subs.<domain>       → :8741"
  echo "  mac.<domain>        → :8742"
  exit 1
fi

if [[ ! -f "$CF_DIR/cert.pem" ]]; then
  echo "Not logged in. Run this first (opens browser):"
  echo "  cloudflared tunnel login"
  exit 1
fi

mkdir -p "$CF_DIR"

if ! cloudflared tunnel list 2>/dev/null | grep -qw "$NAME"; then
  echo "Creating tunnel: $NAME"
  cloudflared tunnel create "$NAME"
else
  echo "Tunnel already exists: $NAME"
fi

# credentials file is ~/.cloudflared/<uuid>.json
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
  exit 1
fi

cat >"$CONFIG" <<YAML
tunnel: $UUID
credentials-file: $CREDS

ingress:
  - hostname: ops.$DOMAIN
    service: http://127.0.0.1:5173
  - hostname: city.$DOMAIN
    service: http://127.0.0.1:8765
  - hostname: comic.$DOMAIN
    service: http://127.0.0.1:8770
  - hostname: whatsapp.$DOMAIN
    service: http://127.0.0.1:8787
  - hostname: jugaad.$DOMAIN
    service: http://127.0.0.1:8790
  - hostname: subs.$DOMAIN
    service: http://127.0.0.1:8741
  - hostname: mac.$DOMAIN
    service: http://127.0.0.1:8742
  - service: http_status:404
YAML

echo "Wrote $CONFIG"

route() {
  local host="$1"
  echo "DNS: $host → tunnel $NAME"
  cloudflared tunnel route dns "$NAME" "$host" || true
}

route "ops.$DOMAIN"
route "city.$DOMAIN"
route "comic.$DOMAIN"
route "whatsapp.$DOMAIN"
route "jugaad.$DOMAIN"
route "subs.$DOMAIN"
route "mac.$DOMAIN"

SHARE_JSON="$ROOT/public/data/share-url.json"
STAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
python3 - <<PY
import json
from pathlib import Path
Path("$SHARE_JSON").write_text(json.dumps({
  "url": "https://ops.$DOMAIN",
  "services": {
    "5173": "https://ops.$DOMAIN",
    "8765": "https://city.$DOMAIN",
    "8770": "https://comic.$DOMAIN",
    "8787": "https://whatsapp.$DOMAIN",
    "8790": "https://jugaad.$DOMAIN",
    "8741": "https://subs.$DOMAIN",
    "8742": "https://mac.$DOMAIN",
  },
  "by_name": {
    "kingdom": "https://ops.$DOMAIN",
    "city": "https://city.$DOMAIN",
    "comic": "https://comic.$DOMAIN",
    "whatsapp": "https://whatsapp.$DOMAIN",
    "jugaad": "https://jugaad.$DOMAIN",
    "subs": "https://subs.$DOMAIN",
    "mac": "https://mac.$DOMAIN",
  },
  "updated_at": "$STAMP",
  "permanent": True,
  "domain": "$DOMAIN",
  "note": "Named tunnel. Friend always uses https://ops.$DOMAIN",
}, indent=2) + "\n")
PY

LAUNCH="$HOME/Library/LaunchAgents/com.avinash.kingdom-tunnel.plist"
cat >"$LAUNCH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.avinash.kingdom-tunnel</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/cloudflared</string>
    <string>tunnel</string>
    <string>--config</string>
    <string>$CONFIG</string>
    <string>run</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/kingdom-tunnel.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/kingdom-tunnel.err</string>
</dict>
</plist>
PLIST

echo "Wrote $LAUNCH"
echo
echo "========================================"
echo "Permanent friend link:"
echo "  https://ops.$DOMAIN"
echo
echo "Start tunnel now (and on login):"
echo "  launchctl load -w $LAUNCH"
echo "  # or:  npm run share:named"
echo
echo "Stop:"
echo "  launchctl unload $LAUNCH"
echo "========================================"
