-- Claims table
CREATE TABLE public.claims (
  id text PRIMARY KEY,
  patient text NOT NULL,
  patient_id text NOT NULL,
  facility text NOT NULL,
  diagnosis_code text NOT NULL,
  diagnosis text NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  amount integer NOT NULL,
  risk_score integer NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('High','Medium','Low')),
  submitted_at timestamptz NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read claims"
  ON public.claims FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update claims"
  ON public.claims FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX claims_risk_score_idx ON public.claims (risk_score DESC);
CREATE INDEX claims_risk_level_idx ON public.claims (risk_level);
CREATE INDEX claims_facility_idx ON public.claims (facility);

-- AI fraud analysis output
CREATE TABLE public.claim_risk_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  model text NOT NULL,
  summary text NOT NULL,
  risk_score integer NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('High','Medium','Low')),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation text NOT NULL,
  raw jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_risk_analysis TO authenticated;
GRANT ALL ON public.claim_risk_analysis TO service_role;

ALTER TABLE public.claim_risk_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read analyses"
  ON public.claim_risk_analysis FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert analyses"
  ON public.claim_risk_analysis FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE INDEX claim_risk_analysis_claim_idx ON public.claim_risk_analysis (claim_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER claims_set_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();