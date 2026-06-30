# Railway builds this from the repo root (Root Directory: ".", Dockerfile Path: "railway/backend.Dockerfile").
#
# Why this exists: docker-compose.yml bind-mounts ./openimis.json into the official
# ghcr.io/openimis/openimis-be image for local dev. Railway's "deploy from public image"
# services can't bind-mount repo files, so the same config has to be baked into the
# image at build time instead.
FROM ghcr.io/openimis/openimis-be:develop

COPY openimis.json /app/openimis.json
