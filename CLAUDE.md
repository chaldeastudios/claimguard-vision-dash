# ClaimGuard — Project Context for Claude Code

This file gives Claude Code the full context of what this project is, what's been decided, and what's been built so far. Read this before making changes.

## What this is

ClaimGuard is an AI-powered fraud risk scoring tool for OpenIMIS, built for the iLabAfrica/Strathmore Digital Health Financing Hackathon (pitch: June 26–27, 2026). Track: OpenIMIS Innovation Track + AI and Emerging Technologies.

**The problem**: Kenya's SHA (Social Health Authority, which replaced NHIF in Oct 2024) lost an estimated KES 11 billion to fraudulent claims in its first ~6 months of operation. Claims pass through standard review undetected.

**The solution**: A module that hooks into OpenIMIS's claims pipeline and scores every submitted claim for fraud risk using AI/ML, before payment is released. Flags go to a human reviewer — this is human-in-the-loop, not automated rejection.

## Who the user is (important — get this right)

The end user is an **insurance scheme / payer**, e.g. SHA — NOT a hospital. Hospitals submit claims into OpenIMIS; the insurance scheme's claims reviewers/auditors use ClaimGuard to review claims coming in from MANY different hospitals. The core value proposition depends on this: a single hospital can never see that "this patient claimed treatment at 3 different hospitals in 14 days" — only the insurer, seeing across all facilities, can catch that pattern. Keep this framing consistent in any copy, data modeling, or feature decisions.

## Team & repo structure

Three-person team, part-time (evenings/weekends), full skill coverage: frontend, backend, ML/data science, SQL.

Two architecturally separate things are being built:

1. **A real OpenIMIS backend module** (`openimis-be-fraud_py`) — Django, hooks into OpenIMIS's actual claims signal pipeline. This is the "true" Track 1 deliverable: a real extension to OpenIMIS, registered via `openimis.json`, using the documented `signal_mutation_module_after_mutating["claim"]` signal pattern (same pattern used by the official openIMIS-AI specification). It listens for `SubmitClaimMutation`, runs fraud scoring, and writes a `FraudScore` record back.

2. **A standalone frontend app** (originally scaffolded with an external AI website builder, NOT inside the OpenIMIS frontend module system) — this is a fraud review dashboard for insurer-side reviewers. It's a companion web app that talks to the backend via API, not something embedded inside OpenIMIS's actual UI shell. In the pitch, this is framed honestly as a companion reviewer tool consuming OpenIMIS claims data via API — not literally embedded in OpenIMIS.

If Claude Code is being used on the **backend/OpenIMIS module repo**, focus on item 1. If it's being used on the **frontend dashboard repo**, focus on item 2 and its current state (see below).

## Backend module — technical plan

- Module name: `openimis-be-fraud_py`, sibling to `openimis-be_py` (assembly), `openimis-be-claim_py` (reference module), `openimis-be-core_py` (signals).
- Structure: `apps.py`, `models.py`, `schema.py`, `services.py`, `signals.py` — standard OpenIMIS module layout.
- Data model: `FraudScore` — `claim_uuid`, `score` (float 0–1 or 0–100, pick one and be consistent), `risk_level` (High/Medium/Low), `reasons` (JSONField), `scored_at`.
- Signal hook (in `schema.py`):
  ```python
  from core.signals import signal_mutation_module_after_mutating

  def on_claim_submitted(sender, **kwargs):
      if kwargs.get('mutation_class') != 'SubmitClaimMutation':
          return []
      if kwargs.get('error_messages'):
          return []
      claim_uuid = kwargs['data']['uuid']
      result = FraudScoringService.score(claim_uuid)
      FraudScore.objects.create(
          claim_uuid=claim_uuid,
          score=result['score'],
          risk_level=result['risk_level'],
          reasons=result['reasons']
      )
      return []

  def bind_signals():
      signal_mutation_module_after_mutating["claim"].connect(on_claim_submitted)
  ```
- Register the module in `openimis.json` once scaffolded.
- Expose GraphQL queries: `fraudScores(claimUuid)`, `fraudQueue(riskLevel, limit)`, plus a stats query (total scored, % high-risk, est. KES value at risk).
- The ML scoring logic lives behind a single clean interface: `score_claim(claim_dict) -> {score, risk_level, reasons[]}`. Whoever owns ML hands this function off; backend wraps it in `FraudScoringService`.
- Fraud signal features to model: amount-vs-diagnosis-benchmark ratio, near-duplicate claims (same patient/facility/diagnosis within 7 days — note OpenIMIS core already catches exact duplicates, this catches near-duplicates), provider/facility volume outliers, service-diagnosis mismatches, patient velocity (multiple facilities in a short window — the signature cross-hospital fraud pattern), timing anomalies (batch/odd-hour submissions).
- OpenIMIS reference repos: `github.com/openimis`. Key ones: `openimis-be_py`, `openimis-be-claim_py`, `openimis-be-core_py`, `openimis-fe_js`, `openimis-fe-claim_js`, `openimis-dist_dkr` (Docker setup for a running local instance).

## Frontend — current state and direction

Originally scaffolded with an external AI website builder that generates its own repo rather than attaching to an existing one. That tool's runtime dependency, private registry references, and cloud-auth integration have since been fully removed from this codebase — auth runs on the team's own named Supabase project, and AI claim analysis calls Google's Gemini API directly.

**Brand identity** (locked in, do not deviate without reason): adapted from a reference brand called "Mindoor," reframed for fraud detection. Key visual rules:
- Warm off-white background `rgb(255,254,251)`, never pure white/cool gray.
- Headings: IBM Plex Serif, with the brand's signature move — **one key word per heading italicized and colored orange** `rgb(251,96,50)`. This is the most recognizable brand element, preserve it everywhere.
- Body: IBM Plex Sans, muted gray, never full black.
- Buttons: solid pill shape, warm brown `rgb(141,105,89)`, white text.
- Cards: no borders/shadows — flat color blocks (cream `rgb(229,224,217)`, sage green `rgb(161,161,106)`, near-black `rgb(41,37,36)`) against the off-white page, large radii (20–24px).
- Icons: abstract botanical/organic glyphs in warm brown, not literal line icons.
- Risk badges are the one place allowed to deviate: red/High, orange-amber/Medium, green/Low — for legibility.
- Product name placeholder: **ClaimGuard** (confirm if this is final or still a placeholder).

**Site structure**:
- `/` — marketing landing page (hero, fraud-category cards, stats bar, "why choose us" section), reframed from the Mindoor reference screenshots. Pitches to insurance companies/schemes, not hospitals or consumers.
- `/dashboard` — separate visual mode, app-shell layout (sidebar nav: Overview, Claims Queue, Hospitals, Settings), same brand tokens but dashboard layout patterns.
  - `/dashboard` (Overview): 4 KPI cards, risk distribution chart, recent high-risk claims list.
  - `/dashboard/claims`: full claims queue table — Claim ID, Patient, Facility, Diagnosis, Amount (KES), Risk Score, Risk Level badge, Submitted Date. Sortable, filterable (risk level, date range, hospital), searchable. Read-only — there is no claim-creation UI in ClaimGuard; claims are entered in openIMIS and ClaimGuard just displays them.
  - Claim Detail (`dashboard.claims.$claimId.tsx`): full claim metadata, risk score, "Why this was flagged" reasons list (with a graceful "Not yet analyzed" state and a manual "Run AI analysis" button), Approve/Flag for Investigation/Reject buttons (UI only — not yet wired to write anywhere).

**Auth — done**:
- Real **Supabase Auth**, connected to the named external "ClaimGuard" Supabase org/project (not a bundled cloud-auth service — that path was explicitly avoided and has since been fully removed from the codebase).
- Email/password sign in and sign up (`src/routes/auth.tsx`) match the established brand identity. There is no social/OAuth sign-in currently — it was removed along with the third-party cloud-auth SDK it depended on; if OAuth is wanted later, wire it through Supabase's own OAuth provider config, not a bundled auth service.
- Successful auth → redirect to `/dashboard`.

**Data — done**:
- Claims themselves are **not** stored in Supabase. `src/lib/openimis.server.ts` is a server-only GraphQL client (django-graphql-jwt auth, service-account credentials via `OPENIMIS_USERNAME`/`OPENIMIS_PASSWORD` env vars) that fetches claims live from openIMIS's own Django backend over the internal Docker network (`http://backend:8000/api/graphql`). `src/lib/claims-api.ts` wraps this in TanStack Start server functions (`fetchClaims`, `fetchClaim`) and merges in risk analyses. This reflects the real architecture: openIMIS is the system of record for claims, ClaimGuard is a companion reviewer tool that reads from it, not a place claims get created.
- `claim_risk_analysis` (in `supabase/migrations/`, RLS enabled, authenticated-user policies) is ClaimGuard's own AI/heuristic analysis output, keyed by the openIMIS claim `uuid` — not a Supabase-internal id. It's written from two places: the backend fraud module's signal hook (`openimis-be-fraud_py/services.py`'s `_sync_to_supabase`, on `SubmitClaimMutation`) and the dashboard's manual "Run AI analysis" button (`analyzeClaim`, `src/lib/ai-analysis.functions.ts`).
- The Supabase `claims` table (and the claim-creation UI/server fn that used to write to it) was removed — see `supabase/migrations/20260702120000_drop_claims_table.sql`. Demo/seed claims are created directly in openIMIS via Django ORM (or the openIMIS UI) instead.
- Approve/Flag for Investigation/Reject buttons on Claim Detail are UI-only — not wired to write anywhere yet.

**AI integration — done**:
- Calls Google's Gemini API directly (`gemini-2.5-flash`, `GEMINI_API_KEY` env var) — no third-party AI gateway.
- Trigger: manual "Run AI analysis" button in Claim Detail (decided over fully-automatic-on-submit, for easier demo control).
- The AI call fetches the claim from openIMIS (`getOpenimisClaim`) and sends it (diagnosis, amount, hospital, services billed if recorded, etc.) to Gemini, which returns structured JSON: risk score (0–100), risk level (High/Medium/Low), 2–4 plain-language reasons.
- Response gets written to `claim_risk_analysis`, keyed by the openIMIS claim uuid.
- Claim Detail's "Why this was flagged" section pulls the latest analysis from this table — with a graceful "Not yet analyzed" state (plus the analysis button) for claims with no analysis yet, rather than broken/empty UI.

## Demo narrative (for context on why certain decisions were made)

The pitch demo flow: open the reviewer dashboard showing a populated queue → submit/trigger a clearly fraudulent claim live → watch it get flagged in real time with a risk score and plain-language reasons → show a clean claim scoring low for contrast → close with the integration story (this is a real OpenIMIS module, deployable to any existing OpenIMIS instance via `openimis.json`, no core changes needed).

Anticipated judge questions to keep in mind when making technical decisions: "You used synthetic data — would this work on real claims?", "What's the false positive rate?", "How does this differ from OpenIMIS's existing duplicate check?" (answer: OpenIMIS catches exact duplicates; this catches statistical anomalies and cross-facility patterns that pass the existing checks).

## Working style notes

- Team is part-time — prioritize working end-to-end flows over polish at each step. Confirm each major piece (auth working, data migration working, AI wiring working) before moving to the next rather than building all three half-finished in parallel.
- Registration/deadline pressure means speed matters, but the OpenIMIS backend module specifically needs to be architecturally correct (real signal hook, real module registration) since that's the actual track requirement — don't fake that part even under time pressure.
