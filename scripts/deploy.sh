#!/usr/bin/env bash
# Deploy site/ to Cloudflare Pages with Wrangler (Direct Upload).
# Creates the Pages project on the first run. Skips quietly if the Cloudflare secrets are not set.
set -euo pipefail

PROJECT="${PAGES_PROJECT:-growsdaily}"
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
echo "Token length: ${#CLOUDFLARE_API_TOKEN} chars (an API token is usually 40; a 37-char hex string is a Global API Key, which won't work)"
echo "Account ID length: ${#CLOUDFLARE_ACCOUNT_ID} chars (should be 32)"
user_check=$(verify "$API/user/tokens/verify" | summary)
echo "User-token check:    $user_check"
if [[ "$user_check" != OK* ]]; then
  acct_check=$(verify "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify" | summary)
  echo "Account-token check: $acct_check"
  if [[ "$acct_check" != OK* ]]; then
    echo "::error::Cloudflare rejected CLOUDFLARE_API_TOKEN. Create a new API token (not the Global API Key, not the token ID), with no IP filtering and no expired TTL, and paste only the token value into the secret."
    exit 1
  fi
fi

# Create the project the first time; "already exists" is fine, anything else is a real error
if out=$($WRANGLER pages project create "$PROJECT" --production-branch=main 2>&1); then
  echo "Created Cloudflare Pages project \"$PROJECT\"."
elif grep -qi "already exists" <<<"$out"; then
  echo "Cloudflare Pages project \"$PROJECT\" already exists."
else
  echo "$out"
  echo "::error::Could not create the Pages project. Does the API token have 'Account → Cloudflare Pages → Edit' permission?"
  exit 1
fi

$WRANGLER pages deploy site \
  --project-name="$PROJECT" \
  --branch=main \
  --commit-hash="$(git rev-parse HEAD)" \
  --commit-message="$(git log -1 --pretty=%s)" \
  --commit-dirty=true
