# Railway builds this from the repo root (Root Directory: ".", Dockerfile Path: "railway/backend.Dockerfile").
#
# Why this exists: docker-compose.yml bind-mounts ./openimis.json into the official
# ghcr.io/openimis/openimis-be image for local dev. Railway's "deploy from public image"
# services can't bind-mount repo files, so the same config has to be baked into the
# image at build time instead.
FROM ghcr.io/openimis/openimis-be:develop

COPY openimis.json /app/openimis.json

# The base image's ENTRYPOINT is a script that dispatches on its first arg
# (start, manage, worker, etc — see docker-compose.yml's `command: start`).
# Setting CMD here (rather than a Railway "Custom Start Command" override)
# keeps that ENTRYPOINT intact and just supplies its argument, exactly like
# Compose does. A Railway start-command override replaces the whole
# ENTRYPOINT + CMD chain and fails with "executable `start` not found".
CMD ["start"]
