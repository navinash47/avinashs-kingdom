#!/usr/bin/env bash
# Quick health check for share links
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSON="$ROOT/public/data/share-url.json"

if [[ ! -f "$JSON" ]]; then
  echo "No share-url.json — run: npm run share"
  exit 1
fi

url=$(python3 -c "import json; print(json.load(open('$JSON')).get('url',''))")
echo "Kingdom: $url"
code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$url/" || echo 000)
echo "  HTTP $code"
if [[ "$code" != "200" ]]; then
  echo "  ↳ Dead or not ready — run: npm run share"
  exit 1
fi

python3 <<PY
import json, subprocess
data = json.load(open("$JSON"))
for port, u in sorted(data.get("services", {}).items(), key=lambda x: int(x[0])):
    if u == data.get("url"):
        continue
    try:
        r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "12", u + "/"], capture_output=True, text=True)
        st = r.stdout.strip() or "000"
    except Exception:
        st = "err"
    mark = "ok" if st == "200" else "FAIL"
    print(f"  :{port} [{mark}] {u}")
PY

echo "All good — send friend ONLY: $url"
