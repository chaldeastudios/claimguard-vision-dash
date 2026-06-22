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

2. **A standalone frontend app** (built in Lovable, NOT inside the OpenIMIS frontend module system) — this is a fraud review dashboard for insurer-side reviewers. Lovable can't attach to an existing repo or be registered as a real `openimis-fe_js` module, so this is a companion web app that will eventually talk to the backend via API, not something embedded inside OpenIMIS's actual UI shell. In the pitch, this is framed honestly as a companion reviewer tool consuming OpenIMIS claims data via API — not literally embedded in OpenIMIS.

If Claude Code is being used on the **backend/OpenIMIS module repo**, focus on item 1. If it's being used on the **Lovable-exported frontend repo**, focus on item 2 and its current state (see below).

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

Built in **Lovable** (lovable.dev), which cannot attach to an existing GitHub repo while building — it generates its own. If this is being picked up in Claude Code now, it likely means the Lovable-generated repo has been exported/connected to GitHub and further dev is continuing here.

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
  - `/dashboard/claims`: full claims queue table — Claim ID, Patient, Facility, Diagnosis, Amount (KES), Risk Score, Risk Level badge, Submitted Date. Sortable, filterable (risk level, date range, hospital), searchable.
  - Claim Detail (modal/slide-over/route — implementation detail left to Lovable): full claim metadata, risk score, "Why this was flagged" reasons list, Approve/Flag for Investigation/Reject buttons.

**Auth — IMPORTANT, in progress as of this handoff**:
- Auth is being built with **Supabase Auth**, connected to an existing Supabase organization and project both named **"ClaimGuard"**.
- **Lovable Cloud must NOT be used.** Lovable Cloud is Lovable's own resold/managed Supabase backend and is the default path the moment backend/auth functionality is requested — it must be explicitly avoided in favor of linking directly to the named external Supabase org/project. If you're continuing this work and see a Lovable Cloud project instead of the named Supabase org, that's a mistake to fix, not a state to build on top of.
- Sign In / Sign Up pages should match the established brand identity exactly (not a generic auth template look).
- Successful auth → redirect to `/dashboard`. A previous placeholder behavior ("Sign In just navigates to /dashboard with no real auth") is meant to be fully replaced by real Supabase auth, not left in place alongside it.

**Data — in progress as of this handoff**:
- All mock/hardcoded claims data is meant to be migrated OUT of the frontend codebase and INTO real Supabase tables. By the time this file is being read, check whether that migration is complete — if mock data still exists in the repo, that's leftover work, not the intended end state.
- Minimum tables:
  - `claims` — claim identifier, patient name, hospital/facility name, diagnosis code/name, claim amount, currency, submitted date, `status` (pending/approved/rejected/flagged — maps to the Approve/Flag/Reject buttons).
  - `claim_risk_analysis` — FK to claim, risk score (0–100), risk level (High/Medium/Low), reasons (array/JSON), analyzed_at timestamp. This is where AI-generated fraud analysis results land.
  - Possibly a `hospitals` table for normalization (left to implementer judgment).
- RLS enabled on all tables. Policy intent: only authenticated users can read/write — simple authenticated-user policies, not per-row ownership rules (single internal team for now, not multi-tenant).
- Mock data (Kenyan names, hospital names like Kenyatta National Hospital / Aga Khan University Hospital / Nakuru Level 5 Hospital / Moi Teaching and Referral Hospital, ICD-10-style codes, KES amounts) was seeded into these tables rather than discarded, so the demo stays populated.
- Approve/Flag for Investigation/Reject buttons should write to the `status` column on the real claim row, with the UI reflecting the update.

**AI integration — in progress as of this handoff**:
- Uses Lovable's built-in AI connector (Gemini/GPT access, no separate API key setup) — not a custom integration from scratch.
- Trigger: likely a manual "Analyze" button in Claim Detail (decided over fully-automatic-on-submit, for easier demo control — confirm this is still the chosen approach).
- The AI call sends claim data (diagnosis, amount, hospital, services billed, etc.) and should return structured JSON: risk score (0–100), risk level (High/Medium/Low), 2–4 plain-language reasons.
- Response gets written to `claim_risk_analysis`, linked to the claim.
- Claim Detail's "Why this was flagged" section should pull the latest real analysis from this table — with a graceful "Not yet analyzed" state for claims with no analysis yet, rather than broken/empty UI.

## Demo narrative (for context on why certain decisions were made)

The pitch demo flow: open the reviewer dashboard showing a populated queue → submit/trigger a clearly fraudulent claim live → watch it get flagged in real time with a risk score and plain-language reasons → show a clean claim scoring low for contrast → close with the integration story (this is a real OpenIMIS module, deployable to any existing OpenIMIS instance via `openimis.json`, no core changes needed).

Anticipated judge questions to keep in mind when making technical decisions: "You used synthetic data — would this work on real claims?", "What's the false positive rate?", "How does this differ from OpenIMIS's existing duplicate check?" (answer: OpenIMIS catches exact duplicates; this catches statistical anomalies and cross-facility patterns that pass the existing checks).

## Working style notes

- Team is part-time — prioritize working end-to-end flows over polish at each step. Confirm each major piece (auth working, data migration working, AI wiring working) before moving to the next rather than building all three half-finished in parallel.
- Registration/deadline pressure means speed matters, but the OpenIMIS backend module specifically needs to be architecturally correct (real signal hook, real module registration) since that's the actual track requirement — don't fake that part even under time pressure.
