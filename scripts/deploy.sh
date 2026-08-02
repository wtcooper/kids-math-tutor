#!/usr/bin/env bash
#
# Deploy to Vercel from a copy of the tree with no git metadata.
#
# Why this exists: on a Hobby team, Vercel reads git commit metadata off the
# deployment and rejects it as `readyState: BLOCKED` before any build starts if
# the metadata names anyone other than the account owner. A Co-Authored-By
# trailer does it; so does a commit whose author email simply differs from the
# Vercel account's. There is no build log, and the CLI reports it only as
# `UNKNOWN`.
#
# Sending no metadata at all sidesteps the whole question. Committing and
# pushing to GitHub are unaffected — only the deploy needs the clean tree.
#
# Usage:
#   deploy.sh              preview
#   deploy.sh --prod       production
#
set -euo pipefail

PROD=""
[[ "${1:-}" == "--prod" || "${1:-}" == "--production" ]] && PROD="--prod"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

if [[ ! -f .vercel/project.json ]]; then
  echo "No .vercel/project.json — run 'vercel link' first, or the deploy will" >&2
  echo "create a brand new project instead of updating the existing one." >&2
  exit 1
fi

STAGING="$(mktemp -d "${TMPDIR:-/tmp}/vercel-deploy-XXXXXX")"
trap 'rm -rf "$STAGING"' EXIT

echo "Staging a git-free copy in $STAGING"

# .vercel MUST come across or the deploy is unlinked and silently creates a new
# project. node_modules and .next are rebuilt remotely; excluding them is purely
# for speed.
# _archive holds snapshots of superseded code, including copies of .env.local.
# .gitignore does not help here — rsync doesn't read it — and the .env* strip
# below is -maxdepth 1, so it would never reach a nested copy.
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '_archive' \
  --exclude '.playwright-mcp' \
  --exclude 'test-results' \
  --exclude 'playwright-report' \
  --exclude '**/.venv' \
  --exclude 'temp' \
  ./ "$STAGING/"

# Local credentials must never be uploaded. Production reads from Vercel's own
# environment store, so these files have no business in the bundle — and they
# often hold things like a test-database URL that would be actively harmful.
find "$STAGING" -maxdepth 1 -name '.env*' ! -name '.env.example' -delete

if [[ -d "$STAGING/.git" ]]; then
  echo "Refusing to deploy: .git survived the copy, which defeats the point." >&2
  exit 1
fi

echo "Deploying${PROD:+ to production}…"
cd "$STAGING"

# --yes skips the interactive scope/link prompts, which would hang a
# non-interactive run.
OUTPUT="$(vercel deploy $PROD --yes 2>&1)" || {
  echo "$OUTPUT" >&2
  exit 1
}
echo "$OUTPUT"

URL="$(echo "$OUTPUT" | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | tail -1 || true)"
if [[ -z "$URL" ]]; then
  echo
  echo "Deployed, but no URL was parsed from the output. Check 'vercel ls'." >&2
  exit 0
fi

echo
echo "Deployment: $URL"

# The CLI's own status is not trustworthy here — BLOCKED surfaces as UNKNOWN.
# Ask the API what actually happened.
STATE="$(vercel inspect "$URL" 2>&1 | awk '/status/{print $2; exit}' || true)"
echo "Status: ${STATE:-unknown}"

if [[ "$STATE" == "UNKNOWN" || "$STATE" == "ERROR" ]]; then
  cat >&2 <<'DIAGNOSIS'

The deployment did not go READY.

UNKNOWN almost always means readyState: BLOCKED — Vercel rejected it over commit
metadata before building. Confirm it directly:

  TOKEN=$(node -p "JSON.parse(require('fs').readFileSync(process.env.HOME + '/Library/Application Support/com.vercel.cli/auth.json','utf8')).token")
  curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v13/deployments/<id>?teamId=<team>" \
    | jq '{readyState, meta}'

If meta shows a githubCommit* block, metadata reached Vercel despite the clean
copy — check that .git really was excluded. If readyState is BLOCKED with no
meta, the account itself is over a plan limit.
DIAGNOSIS
  exit 1
fi

echo "Done."
