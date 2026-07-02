# Used both by Railway (Root Directory: ".", Dockerfile Path:
# "railway/backend.Dockerfile") and by local docker-compose.yml (backend
# and backend-init both build: from this file).
#
# Why a custom build instead of the plain ghcr.io/openimis/openimis-be
# image: (1) it needs openimis.json baked in -- Railway's image-sourced
# services can't bind-mount repo files the way Compose can, and (2) the
# fraud module needs to be actually pip-installed, which the base image's
# own runtime "install modules if openimis.json looks broken" heuristic
# does not reliably do for a custom third module (see below).
FROM ghcr.io/openimis/openimis-be:develop

COPY openimis.json /app/openimis.json

# Install the fraud module from the local build context instead of a
# remote git+https URL. A remote URL keeps the RUN instruction's literal
# text identical across commits, so Docker's build cache reuses the old
# layer (and the old, possibly-broken module code) even after pushing a
# fix and rebuilding -- `--build` does not imply `--no-cache`. COPYing the
# local directory means the layer hash changes whenever the module's
# source changes, so a normal rebuild always picks up local edits.
#
# Don't rely on the image's own "install modules if openimis.json doesn't
# look OK" runtime heuristic -- it only checks that openimis.json parses,
# not that every module it lists is actually importable, so our custom
# fraud module silently never gets installed through that path. Install it
# explicitly at build time instead, so it's guaranteed present regardless.
COPY openimis-be-fraud_py /opt/openimis/openimis-be-fraud_py
RUN pip install --no-cache-dir /opt/openimis/openimis-be-fraud_py

# The base image's ENTRYPOINT is a script that dispatches on its first arg
# (start, manage, worker, etc — see docker-compose.yml's `command: start`).
# Setting CMD here (rather than a Railway "Custom Start Command" override)
# keeps that ENTRYPOINT intact and just supplies its argument, exactly like
# Compose does. A Railway start-command override replaces the whole
# ENTRYPOINT + CMD chain and fails with "executable `start` not found".
CMD ["start"]
