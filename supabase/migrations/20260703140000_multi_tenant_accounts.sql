-- Multi-tenant accounts: ClaimGuard now serves two kinds of logins --
-- hospitals (submit claims) and insurance institutions (review them).
-- openIMIS itself has no "insurer" concept (it's a single-scheme system),
-- so the org directory and claim<->insurer tagging live entirely here.

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('hospital', 'insurer')),
  name text NOT NULL,
  logo_url text,
  -- openIMIS HealthFacility.uuid this org represents -- hospital orgs only.
  -- Lets the hospital portal lock claim submission to the staff member's
  -- own facility instead of asking them to pick it every time.
  facility_uuid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read organizations" ON public.organizations;
CREATE POLICY "Authenticated users can read organizations" ON public.organizations
  FOR SELECT TO authenticated USING (true);

-- Which account type a profile belongs to, and which organization (hospital
-- or insurer) it represents. Existing accounts predate this split and are
-- reviewers, so they default to 'insurer'.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'insurer'
  CHECK (account_type IN ('hospital', 'insurer'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Which insurer a hospital chose when submitting a given claim, keyed by the
-- openIMIS claim uuid (same join-key convention as claim_risk_analysis).
CREATE TABLE IF NOT EXISTS public.claim_insurer_assignment (
  claim_uuid text PRIMARY KEY,
  insurer_organization_id uuid NOT NULL REFERENCES public.organizations(id),
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.claim_insurer_assignment TO authenticated;
GRANT ALL ON public.claim_insurer_assignment TO service_role;

ALTER TABLE public.claim_insurer_assignment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read claim assignments" ON public.claim_insurer_assignment;
CREATE POLICY "Authenticated users can read claim assignments" ON public.claim_insurer_assignment
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can assign claims to an insurer" ON public.claim_insurer_assignment;
CREATE POLICY "Authenticated users can assign claims to an insurer" ON public.claim_insurer_assignment
  FOR INSERT TO authenticated WITH CHECK (true);
