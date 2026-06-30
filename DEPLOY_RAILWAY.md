# Deploying the openIMIS stack to Railway

This replaces "run `docker-compose up` on a laptop" with an always-on, publicly
reachable openIMIS instance, without managing a VPS/EC2 box. The ClaimGuard
**dashboard stays on Vercel** (`claimguard.chaldeastudios.com`) and **data stays
in Supabase** — this guide only covers the openIMIS side: Postgres, the Django
backend (with the `fraud` module), and the openIMIS React frontend.

`claimguard-dash` and `gateway` from `docker-compose.yml` are **not** deployed
to Railway — the dashboard is already live on Vercel, and each Railway service
gets its own HTTPS domain, so the nginx gateway's routing job is unnecessary
here. `docker-compose.yml` is untouched and still works for local dev.

## Before you start: one blocker, already fixed in this branch

`openimis.json` declared the `fraud` module as installable from
`github.com/chaldeastudios/openimis-be-fraud_py` — that repo doesn't exist
(404). Locally this was likely masked by the bind-mount in
`docker-compose.yml` (`./openimis-be-fraud_py:/opt/openimis/openimis-be-fraud_py`).
Railway's image-sourced services can't bind-mount repo files, so this would
fail on first boot remotely. It's now fixed to install from this monorepo
directly:

```json
"pip": "git+https://github.com/chaldeastudios/claimguard-vision-dash.git@main#egg=openimis-be-fraud&subdirectory=openimis-be-fraud_py"
```

Also note: `openimis.json`'s `external_scorer_endpoint` points at
`claimguard-fraud-engine.herokuapp.com`. The scoring code (`services.py`) calls
this with a 5s timeout wrapped in try/except and falls back to the rule-based
score if it's unreachable, so it's not a deploy blocker — but verify it's
actually live before a demo where you want the AI-scorer path to fire.

## Why a custom Dockerfile for the backend only

`db` and `frontend` deploy straight from the public openIMIS images — they
take all their config via environment variables. `backend` needs one repo
file (`openimis.json`) baked in at `/app/openimis.json`, which Railway can't
bind-mount the way Compose does. `railway/backend.Dockerfile` solves this:

```dockerfile
FROM ghcr.io/openimis/openimis-be:develop
COPY openimis.json /app/openimis.json
```

Railway builds this from the repo (not from a public image), so pushes to
this repo's `openimis.json` or the `fraud` module redeploy automatically.

---

## Step 0 — Starting over (optional)

If a previous attempt is misconfigured, delete it rather than untangling it:
project canvas → **Settings** (top right) → **Danger** tab → **Delete Project**.
Then start fresh at Step 1.

## Step 1 — Create the project

1. [railway.com](https://railway.com) → **New Project** → **Empty Project**.
2. Name it (e.g. `claimguard-openimis`).
3. Connect this GitHub repo (`chaldeastudios/claimguard-vision-dash`) at the
   project level so the `backend` service can build from it in Step 3.

## Step 2 — `db` service (PostgreSQL)

1. **+ New** → **Docker Image** → `ghcr.io/openimis/openimis-pgsql:develop`.
2. Rename the service to `db` (the env files in `railway/` and the
   `${{db.RAILWAY_PRIVATE_DOMAIN}}` references assume this name).
3. **Settings → Volumes** → add a volume mounted at `/var/lib/postgresql/data`.
   Without this, every redeploy wipes the database. If "Volumes" doesn't
   appear in Settings: deploy the service once first (even a failing deploy
   counts), or check the service's region isn't a "metal" region (volumes
   aren't supported there yet — switch regions if so).
4. **Variables** → paste in the contents of `railway/db.env.example`, filling
   in a real `POSTGRES_PASSWORD` (`openssl rand -base64 32`).
5. Deploy. Wait for it to report healthy before moving on.

### Loading demo data (no local tools required)

`demo-data/seed.sql` (the Kenyan hospitals/insurees/claims/fraud scores from
the README) needs to run once against this database — it's not auto-applied
by the image. Do this entirely inside Railway's browser-based **Shell**
(connects straight into the running `db` container) — no TCP proxy, no local
`psql` install needed:

1. Open the `db` service → find the **Shell** tab (a terminal that opens
   directly inside the container).
2. Fetch the seed file from this public repo and run it:
   ```sh
   apt-get update && apt-get install -y curl   # if curl isn't already present
   curl -fsSL https://raw.githubusercontent.com/chaldeastudios/claimguard-vision-dash/main/demo-data/seed.sql -o /tmp/seed.sql
   PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres -d openimis -f /tmp/seed.sql
   ```
   If the image is Alpine-based and `apt-get` isn't found, use `apk add curl`
   instead. `POSTGRES_PASSWORD` is already set as an env var inside this
   exact container, so nothing needs to be typed by hand.
3. Verify: `psql -U postgres -d openimis -c "SELECT count(*) FROM claim_claim;"`
   should return a non-zero count.

## Step 3 — `backend` service (Django + fraud module)

1. **+ New** → **GitHub Repo** → this repo.
2. Rename the service to `backend`.
3. **Settings → Build**: set **Dockerfile Path** to `railway/backend.Dockerfile`,
   **Root Directory** to `/` (repo root — the Dockerfile needs `openimis.json`
   and `openimis-be-fraud_py/` from the repo root as build context).
4. **Variables** → paste `railway/backend.env.example`, filling in:
   - `DB_PASSWORD` — same value as `db`'s `POSTGRES_PASSWORD`.
   - `SECRET_KEY` — `openssl rand -base64 48`.
   - `SUPABASE_URL` / `SUPABASE_KEY` — from your Supabase **ClaimGuard**
     project. **Use the `service_role` key, not the anon/publishable key** —
     RLS only permits authenticated reads/writes, and this backend writes
     server-to-server with no authenticated session, so the anon key gets
     silently rejected. Never reuse this value in the frontend/dashboard env.
5. **Settings → Networking** → generate a public domain. This becomes
   `${{backend.RAILWAY_PUBLIC_DOMAIN}}`, used by `ALLOWED_HOSTS` and by the
   `frontend` service in Step 4.
6. Deploy. Tail the build logs — first boot needs to (a) `pip install` the
   `fraud` module from the monorepo, (b) run migrations, (c) bind the
   `signal_mutation_module_after_mutating["claim"]` hook on `ready()`.
7. Smoke test: `https://<backend-domain>/graphql` should load GraphiQL.

## Step 4 — `frontend` service (openIMIS React SPA)

1. **+ New** → **Docker Image** → `ghcr.io/openimis/openimis-fe:develop`.
2. Rename to `frontend`.
3. **Variables** → paste `railway/frontend.env.example`. `BACKEND_URL` must
   resolve to `backend`'s **public** domain — it's consumed by the browser
   (baked into `env-config.js` at container start), not service-to-service,
   so the private `.railway.internal` address won't work here.
4. **Settings → Networking** → generate a public domain.
5. Deploy. Visit the frontend's domain → openIMIS login screen, `admin` / `admin`.

## Step 5 — Wire the Vercel dashboard to the new backend (if needed)

The dashboard's primary data path is Supabase, not the Django backend
directly — most of it needs no change. If anything in the dashboard links to
the openIMIS portal or calls the GraphQL API directly, point it at
`backend`'s Railway public domain, and re-confirm `CORS_ALLOWED_ORIGINS` on
`backend` includes `https://claimguard.chaldeastudios.com`.

## Step 6 — End-to-end check

1. Log into the `frontend` domain (`admin`/`admin`), submit a claim.
2. Confirm a row lands in the backend's `FraudScore` table
   (`fraudScoreByClaim` query at `/graphql`) and in Supabase's
   `claim_risk_analysis` table.
3. Confirm it shows up live in the Vercel dashboard.

## Ongoing deploys

Pushing to this repo's tracked branch redeploys `backend` automatically
(it's GitHub-connected). `db` and `frontend` only redeploy when you change
their settings/variables, since they're pinned to `:develop` tags on public
images — bump the tag manually if you want to pick up upstream openIMIS
changes.

## Cost ballpark

Postgres + Django + the openIMIS React SPA running 24/7 on Railway's
usage-based Hobby plan: roughly **$15–30/mo**, depending on traffic. Turn off
the Postgres public TCP proxy when not loading data — it doesn't affect
billing but it does affect your attack surface.
