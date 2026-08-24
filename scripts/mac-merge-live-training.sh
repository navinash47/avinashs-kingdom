#!/usr/bin/env bash
# Merge GitHub live-training into the current Mac branch WITHOUT git checkout.
# Safe with dirty Research Lab files: it commits them first, then merges.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "Staying on branch: $(git branch --show-current)"
echo "Do not run: git checkout cursor/live-training-wandb-73ce"

FILES=(
  package.json
  public/data/research-lab.json
  src/App.css
  src/App.tsx
  src/components/ResearchLab.css
  src/components/ResearchLab.tsx
  src/components/VentureBoard.tsx
  vite.config.ts
)

to_add=()
for f in "${FILES[@]}"; do
  [[ -e "$f" ]] || continue
  if [[ -n "$(git status --porcelain -- "$f")" ]]; then
    to_add+=("$f")
  fi
done

if ((${#to_add[@]})); then
  git add -- "${to_add[@]}"
  git commit -m "Keep Mac Kingdom UI before merging live training"
  echo "Committed Mac UI: ${to_add[*]}"
else
  echo "No local Mac UI edits in the known files."
fi

git fetch origin
if git merge origin/cursor/live-training-wandb-73ce -m "Merge live W&B Research Lab from GitHub"; then
  echo "Merge ok. Run: npm run dev   then open http://localhost:5173/?tab=research"
  exit 0
fi

echo
echo "Merge has conflicts. Keep BOTH: Mac fleet graph / App wiring AND the Live training card."
echo "Then: git add -u && git commit"
exit 1
