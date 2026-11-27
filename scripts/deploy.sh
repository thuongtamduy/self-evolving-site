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
