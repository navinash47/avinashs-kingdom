#!/usr/bin/env bash
# Refresh brain/backup + ensure .cursor/skills matches ~/.cursor/skills when present
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOME_SKILLS="${HOME}/.cursor/skills"
PROJ="$ROOT/.cursor/skills"
BACKUP="$ROOT/brain/backup/cursor-skills"
mkdir -p "$PROJ" "$BACKUP"

# Prefer personal skills as source if they exist; else project copy
if [[ -d "$HOME_SKILLS/kingdom-wiki" ]]; then
  SRC="$HOME_SKILLS"
else
  SRC="$PROJ"
fi

for s in kingdom-wiki sync-kingdom log-outreach youtube-provenance phase-gate kingdom-tunnels; do
  rm -rf "$PROJ/$s" "$BACKUP/$s"
  cp -R "$SRC/$s" "$PROJ/$s"
  cp -R "$SRC/$s" "$BACKUP/$s"
done

STAMP=$(date +%Y%m%d)
tar -czf "$BACKUP/kingdom-skills-${STAMP}.tar.gz" -C "$SRC" \
  kingdom-wiki sync-kingdom log-outreach youtube-provenance phase-gate kingdom-tunnels
echo "Backed up skills → $PROJ and $BACKUP (kingdom-skills-${STAMP}.tar.gz)"
