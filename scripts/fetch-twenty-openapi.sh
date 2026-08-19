#!/usr/bin/env bash
# Fetches the OpenAPI specs from our self-hosted Twenty CRM into docs/twenty-openapi/.
# The specs are workspace-specific (they include custom objects/fields), so they are
# gitignored — re-run this after changing anything in Twenty's data model.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

: "${TWENTY_CRM_BASE_URL:?set TWENTY_CRM_BASE_URL in .env}"
: "${TWENTY_CRM_API_KEY:?set TWENTY_CRM_API_KEY in .env}"

OUT=docs/twenty-openapi
mkdir -p "$OUT"

for spec in core metadata; do
  echo "→ fetching $spec"
  curl -sfS --max-time 60 \
    -H "Authorization: Bearer $TWENTY_CRM_API_KEY" \
    "$TWENTY_CRM_BASE_URL/rest/open-api/$spec" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(JSON.parse(s),null,2)+"\n"))' \
  > "$OUT/$spec.json"
  echo "  wrote $OUT/$spec.json ($(wc -c < "$OUT/$spec.json") bytes)"
done
