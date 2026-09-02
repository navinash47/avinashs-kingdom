#!/usr/bin/env bash
# Run the named Kingdom tunnel (stable hostname from named-tunnel-setup.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${HOME}/.cloudflared/kingdom-config.yml"
START_SCRIPT="$ROOT/scripts/start-dashboards.sh"

if [[ ! -f "$CONFIG" ]]; then
  echo "Named tunnel not set up yet."
  echo "  1. cloudflared tunnel login"
  echo "  2. ./scripts/named-tunnel-setup.sh yourdomain.com"
  echo
  echo "Until then, use ephemeral links: npm run share"
  exit 1
fi

echo "Starting local dashboards…"
"$START_SCRIPT" || true

if ! nc -z 127.0.0.1 5173 >/dev/null 2>&1; then
  echo "Kingdom UI not on :5173 — start with: npm run dev:share"
  echo "Then re-run: npm run share:named"
  exit 1
fi

echo "Starting named Cloudflare tunnel (KeepAlive via launchd if loaded)…"
if [[ -f "$HOME/Library/LaunchAgents/com.avinash.kingdom-tunnel.plist" ]]; then
  launchctl unload "$HOME/Library/LaunchAgents/com.avinash.kingdom-tunnel.plist" 2>/dev/null || true
  launchctl load -w "$HOME/Library/LaunchAgents/com.avinash.kingdom-tunnel.plist"
  echo "Tunnel daemon loaded. Friend URL is in public/data/share-url.json"
  python3 -c "import json; print(json.load(open('$ROOT/public/data/share-url.json'))['url'])" 2>/dev/null || true
else
  exec cloudflared tunnel --config "$CONFIG" run
fi
