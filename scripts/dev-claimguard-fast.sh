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

if [ ! -x "node_modules/.bin/vite" ]; then
  echo "==> node_modules missing or incomplete -- running npm install first..."
  npm install
fi

echo "==> Starting ClaimGuard dashboard (npm run dev) on http://localhost:5173 ..."
npm run dev -- --host
