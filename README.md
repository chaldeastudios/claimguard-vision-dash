# ClaimGuard — AI-Powered Claims Fraud Detection for openIMIS

ClaimGuard is an AI-powered fraud risk scoring module integrated with **openIMIS** (Open Insurance Management Information System). Built for the iLabAfrica/Strathmore Digital Health Financing Hackathon (Track 1: openIMIS Innovation Track + AI and Emerging Technologies).

ClaimGuard detects fraudulent patterns in insurance claims — patient velocity across facilities, near-duplicate submissions, diagnosis-amount anomalies — and flags them for human review before payment is released.

**Live Dashboard**: [https://claimguard.chaldeastudios.com/](https://claimguard.chaldeastudios.com/)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Nginx Gateway (port 80)                       │
│  /api/ /graphql → backend:8000                                   │
│  /claimguard/   → claimguard-dash:5173                           │
│  /              → frontend:3000 (openIMIS React UI)              │
└──────────┬──────────────┬──────────────────┬─────────────────────┘
           │              │                  │
    ┌──────▼──────┐  ┌────▼────────┐  ┌──────▼──────────────┐
    │  openIMIS   │  │  openIMIS   │  │  ClaimGuard         │
    │  Backend    │  │  Frontend   │  │  Dashboard (Vite)   │
    │  (Django)   │  │  (React)    │  │  + Supabase Auth    │
    │  + fraud    │  │             │  │                     │
    │    module   │  │             │  │                     │
    └──────┬──────┘  └─────────────┘  └─────────────────────┘
           │
    ┌──────▼──────┐
    │ PostgreSQL  │
    │   15        │
    │ + demo data │
    └─────────────┘
```

### Components

| Service | Container | Port | Description |
|---|---|---|---|
| `db` | `openimis-db` | 5432 | PostgreSQL 15 database with Kenyan demo data |
| `backend-init` | `openimis-backend-init` | — | One-shot: runs migrations + fixtures, then exits |
| `backend` | `openimis-backend` | 8000 | Django backend with ClaimGuard fraud module |
| `frontend` | `openimis-frontend` | 3000 | openIMIS React SPA |
| `claimguard-dash` | `claimguard-dashboard` | 5173 | ClaimGuard fraud review dashboard |
| `gateway` | `openimis-gateway` | **80** | Nginx reverse proxy (single entry point) |

---

## Prerequisites

- **Docker Desktop** installed and running ([download](https://www.docker.com/products/docker-desktop/))
- **Minimum 8 GB RAM** allocated to Docker Desktop (Settings → Resources → Memory)
- **WSL 2** enabled (Windows) — selected during Docker Desktop installation

---

## Quick Start

Running this locally via Docker Compose is required, not optional — the
hackathon's own pre-event checklist verifies a working local Docker stack at
registration, and the live demo happens from what's running in the room. See
the [hackathon handbook](https://openimis.atlassian.net/wiki/spaces/OP) for
the full pre-event setup requirements.

### 1. Clone the Repository
```bash
git clone https://github.com/chaldeastudios/claimguard-vision-dash.git
cd claimguard-vision-dash
```

### 2. Start the Stack
```bash
docker-compose up -d --build
```
Wait for all 6 containers to report healthy (approximately 60–90 seconds on
first run). `backend-init` runs migrations + fixtures once and exits — that's
expected, it won't show as "healthy" like the long-running services.

### 3. Load Demo Data
```bash
docker exec -i openimis-db psql -U postgres -d openimis < demo-data/seed.sql
```
This loads 5 Kenyan hospitals, 12 insurees, 15 claims, and 8 fraud scores.

### 4. Verify
| What | URL | Expected |
|---|---|---|
| openIMIS Portal | http://localhost | Login screen (admin / admin) |
| GraphiQL Explorer | http://localhost/graphql | Interactive GraphQL IDE |
| ClaimGuard Dashboard | http://localhost/claimguard/ | Fraud review dashboard |
| Backend API Direct | http://localhost:8000/graphql | GraphQL endpoint (direct) |

---

## Backend Module: `openimis-be-fraud_py`

The fraud detection module is a standard openIMIS Django backend module, registered via `openimis.json`:

```
openimis-be-fraud_py/
├── __init__.py           # Python package init
├── apps.py               # Django AppConfig — binds signals on ready()
├── models.py             # FraudScore model (claim_uuid, score, risk_level, reasons)
├── signals.py            # Hooks into SubmitClaimMutation via core signals
├── services.py           # Rule-based scoring engine (amount ratio, duplicates, velocity)
├── schema.py             # Graphene-Django GraphQL queries
├── fhir.py               # HL7 FHIR R4 resource converters
├── tests.py              # Unit tests for scoring, signals, and FHIR
├── setup.py              # Package installer metadata
└── migrations/
    ├── __init__.py
    └── 0001_initial.py   # Creates claim_fraud_score table
```

### Signal Integration (non-monkey-patched)
```python
# signals.py — hooks into openIMIS core without modifying core code
from core.signals import signal_mutation_module_after_mutating

def on_claim_submitted(sender, **kwargs):
    if kwargs.get('mutation_class') != 'SubmitClaimMutation':
        return []
    claim_uuid = kwargs['data']['uuid']
    result = FraudScoringService.score_claim_by_uuid(claim_uuid)
    FraudScore.objects.update_or_create(claim_uuid=claim_uuid, defaults=result)
    return []

def bind_signals():
    signal_mutation_module_after_mutating["claim"].connect(on_claim_submitted)
```

### GraphQL Queries
```graphql
# Fetch fraud score for a specific claim
query {
  fraudScoreByClaim(claimUuid: "uuid-here") {
    score
    riskLevel
    reasons
    scoredAt
  }
}

# Dashboard statistics
query {
  fraudDashboardStats {
    totalClaimsScored
    highRiskPercentage
    estimatedKesAtRisk
    averageFraudScore
  }
}
```

### FHIR R4 Compliance
All data exchange follows HL7 FHIR R4 standards:
- **Patient** ↔ openIMIS Insuree
- **Claim** ↔ openIMIS Claim (with KES currency)
- **ClaimResponse** ↔ Fraud analysis results (via FHIR Extensions at `https://claimguard.dev/fhir/StructureDefinition/claim-fraud-analysis`)

---

## openIMIS Module Registration

The module is registered in [`openimis.json`](openimis.json):
```json
{
  "modules": [
    { "name": "core",     "pip": "openimis-be-core==1.2.0rc1" },
    { "name": "claim",    "pip": "openimis-be-claim==1.2.0rc1" },
    { "name": "api_fhir", "pip": "openimis-be-api-fhir-r4==1.2.0rc1" },
    { "name": "fraud",    "pip": "git+https://github.com/chaldeastudios/openimis-be-fraud_py.git@main" }
  ]
}
```

---

## Running Tests
```bash
docker exec -it openimis-backend python manage.py test fraud
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Dashboard | React + Vite + TanStack Router + Tailwind |
| Backend Module | Python / Django / Graphene-Django |
| Database | PostgreSQL 15 |
| Auth | Supabase Auth |
| Interoperability | HL7 FHIR R4 |
| Containerization | Docker Compose |
| Gateway | Nginx |

---

## License

GNU AGPL v3 — as required by the openIMIS ecosystem.
