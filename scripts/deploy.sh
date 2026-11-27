#!/usr/bin/env bash
# Deploy site/ (+ functions/) to Cloudflare Pages with Wrangler.
# First run: creates the Pages project and the D1 database for the shared pet.
# Skips quietly if the Cloudflare secrets are not set.
set -euo pipefail

PROJECT="${PAGES_PROJECT:-growsdaily}"
DB_NAME="${D1_NAME:-growsdaily-db}"
WRANGLER="npx --yes wrangler@4"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "::warning::CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID secrets are not set, skipping deploy."
  exit 0
fi

# Tolerate copy-paste accidents: surrounding whitespace/newlines, quotes, a "Bearer " prefix
clean() { local v="$1"; v="${v#Bearer }"; v="$(printf '%s' "$v" | tr -d '[:space:]"'"'"'')"; printf '%s' "$v"; }
export CLOUDFLARE_API_TOKEN="$(clean "$CLOUDFLARE_API_TOKEN")"
export CLOUDFLARE_ACCOUNT_ID="$(clean "$CLOUDFLARE_ACCOUNT_ID")"

# Preflight: is the token itself valid? (tries user-owned, then account-owned tokens)
API="https://api.cloudflare.com/client/v4"
verify() { curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$1"; }
summary() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const m=[...(j.errors||[]),...(j.messages||[])].map(x=>`[${x.code}] ${x.message}`).join("; ");console.log((j.success&&j.result?.status==="active"?"OK ":"FAIL ")+(j.result?.status||"")+" "+m)}catch{console.log("FAIL unreadable response")}})'; }
user_check=$(verify "$API/user/tokens/verify" | summary)
if [[ "$user_check" != OK* ]]; then
  acct_check=$(verify "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify" | summary)
  if [[ "$acct_check" != OK* ]]; then
    echo "User-token check:    $user_check"
    echo "Account-token check: $acct_check"
    echo "::error::Cloudflare rejected CLOUDFLARE_API_TOKEN. Create a new API token and paste only the token value into the secret."
    exit 1
  fi
fi

# 1. Pages project ("already exists" is fine)
if out=$($WRANGLER pages project create "$PROJECT" --production-branch=main 2>&1); then
  echo "Created Cloudflare Pages project \"$PROJECT\"."
elif grep -qi "already exists" <<<"$out"; then
  echo "Cloudflare Pages project \"$PROJECT\" already exists."
else
  echo "$out"
  echo "::error::Could not create the Pages project. Does the API token have 'Account → Cloudflare Pages → Edit'?"
  exit 1
fi

# 2. D1 database for the shared pet (optional: without it the site still works, the API answers 503)
db_id() { $WRANGLER d1 list --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const d=JSON.parse(s).find(x=>x.name===process.argv[1]);console.log(d?(d.uuid||d.id||""):"")}catch{console.log("")}})' "$DB_NAME"; }
DB_ID="$(db_id)"
if [[ -z "$DB_ID" ]]; then
  echo "Creating D1 database \"$DB_NAME\"…"
  $WRANGLER d1 create "$DB_NAME" >/dev/null 2>&1 || true
  DB_ID="$(db_id)"
fi

rm -f wrangler.toml
if [[ -n "$DB_ID" ]]; then
  node -e 'import("./lib/world.js").then(m=>process.stdout.write(m.SCHEMA.join(";\n")+";\n"))' > /tmp/schema.sql
  $WRANGLER d1 execute "$DB_NAME" --remote --file /tmp/schema.sql >/dev/null
  echo "D1 database \"$DB_NAME\" ready."
  cat > wrangler.toml <<EOF
name = "$PROJECT"
pages_build_output_dir = "site"
compatibility_date = "2026-11-01"

[[d1_databases]]
binding = "DB"
database_name = "$DB_NAME"
database_id = "$DB_ID"
EOF
else
  echo "::warning::Could not create or find the D1 database. The site is deployed without the shared pet. Give the API token 'Account → D1 → Edit' and run Deploy again."
fi

# 3. Deploy static site + functions
$WRANGLER pages deploy site \
  --project-name="$PROJECT" \
  --branch=main \
  --commit-hash="$(git rev-parse HEAD)" \
  --commit-message="$(git log -1 --pretty=%s)" \
  --commit-dirty=true
rm -f wrangler.toml
