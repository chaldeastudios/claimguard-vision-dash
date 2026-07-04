#!/usr/bin/env bash
# Fast iteration loop for the ClaimGuard dashboard ONLY.
#
# Does NOT touch the openIMIS frontend container -- that Docker build (it
# fetches openimis-claimguard-module fresh from GitHub) takes ~15 min and
# only needs re-running when the module or the fork's openimis.json/deps
# actually change. This script just makes sure the backend/data services the
# dashboard's server-side GraphQL client depends on are up, then runs the
# dashboard's own Vite dev server in the foreground so edits hot-reload
# immediately. Run from the repo root:
#
#   bash scripts/dev-claimguard-fast.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Ensuring backend services are up (db, rabbitmq, backend-init, backend, worker)..."
docker-compose up -d db rabbitmq backend-init backend worker

echo "==> Waiting for the backend to answer on :8000..."
until curl -s -o /dev/null http://localhost:8000/api/graphql; do
  echo "    ...still waiting"
  sleep 2
done
echo "    backend is up."

clean_install() {
  echo "==> Doing a clean install (rm -rf node_modules package-lock.json && npm install)..."
  rm -rf node_modules package-lock.json
  npm install
}

if [ ! -x "node_modules/.bin/vite" ]; then
  echo "==> node_modules missing or incomplete -- installing first..."
  clean_install
fi

echo "==> Starting ClaimGuard dashboard (npm run dev) on http://localhost:3001 ..."
if ! npm run dev -- --host; then
  # Common on Windows: an optional native binding (rolldown/rollup's
  # platform-specific .node binary) fails to install correctly on the first
  # `npm install` -- a known npm bug (npm/cli#4828), not a code problem. The
  # documented fix is exactly this: wipe node_modules + the lockfile and
  # reinstall from scratch. Try that once automatically before giving up.
  echo "==> npm run dev failed -- retrying once with a clean install"
  echo "    (this is usually npm/cli#4828, a Windows optional-dependency bug)..."
  clean_install
  npm run dev -- --host
fi
