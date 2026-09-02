#!/usr/bin/env bash
# Restore Kingdom Cursor skills into ~/.cursor/skills (works after account switch / new machine)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/.cursor/skills"
DEST="${HOME}/.cursor/skills"
mkdir -p "$DEST"
for s in kingdom-wiki sync-kingdom log-outreach youtube-provenance phase-gate kingdom-tunnels; do
  if [[ ! -d "$SRC/$s" ]]; then
    echo "Missing $SRC/$s" >&2
    exit 1
  fi
  rm -rf "$DEST/$s"
  cp -R "$SRC/$s" "$DEST/$s"
  echo "Restored $s → $DEST/$s"
done
echo "Done. Restart Cursor or start a new agent chat if skills do not show yet."
