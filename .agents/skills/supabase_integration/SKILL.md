---
name: supabase-integration
description: Guidelines for managing Supabase operations, schema migrations, and querying data.
---

# Supabase Integration Guidelines

Apply these instructions when interacting with the Supabase backend (auth, database tables, migrations, RLS policies).

## Database Tables

We use the following database tables:
- `claims`:
  - `id` (uuid, primary key)
  - `patient_name` (text)
  - `facility_name` (text)
  - `diagnosis_code` (text)
  - `diagnosis_name` (text)
  - `amount` (numeric)
  - `currency` (text, e.g. "KES")
  - `status` (text: 'pending', 'approved', 'rejected', 'flagged')
  - `submitted_at` (timestamptz)
- `claim_risk_analysis`:
  - `id` (uuid, primary key)
  - `claim_id` (uuid, foreign key referencing claims.id)
  - `risk_score` (numeric, 0-100)
  - `risk_level` (text: 'High', 'Medium', 'Low')
  - `reasons` (jsonb/text array)
  - `analyzed_at` (timestamptz)

## Auth Implementation

- Real Supabase auth should be used instead of mock dashboard redirects.
- Standard sign-in / sign-up pages must match the ClaimGuard brand guidelines.
- After login, redirect to `/dashboard`.

## Row Level Security (RLS)

- Enable RLS on all tables.
- Authenticated users should have full read/write access (no complex row policies needed yet).

## Supabase CLI & Migrations

- The `supabase-mcp-server` server provides tools to list, create, and apply migrations, run SQL, etc.
- Use `execute_sql` tool to run raw queries or updates during development.
