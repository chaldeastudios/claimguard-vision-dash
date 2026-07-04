#!/usr/bin/env bash
# Full stack rebuild: openIMIS backend + frontend (wired to the
# openimis-claimguard-module) AND the ClaimGuard dashboard, all via
# docker-compose. Use this once dashboard changes have been reviewed with
# scripts/dev-claimguard-fast.sh and you're ready to see them inside openIMIS
# itself (the "Welcome" home page widget, claim-detail panel, etc).
#
# --no-cache on the frontend build specifically is required, not optional:
# openimis-claimguard-module is fetched from GitHub during `docker build`, and
# without --no-cache Docker can reuse a cached layer from before the module's
# last push instead of re-fetching it (see docker-compose.yml/backend.Dockerfile
# comments on this). Everything else can use normal caching.
#
#   bash scripts/rebuild-full-stack.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Rebuilding openIMIS frontend from scratch (picks up the latest"
echo "    openimis-claimguard-module + openimis-fe_js commits)... this is the"
echo "    ~15 min step."
docker-compose build --no-cache frontend

echo "==> Building/starting everything else and bringing the full stack up..."
docker-compose up -d --build

cat <<'EOF'

==> Stack is up:
    openIMIS UI:      https://localhost/front   (self-signed cert warning expected)
    ClaimGuard dash:  http://localhost:3001
EOF
