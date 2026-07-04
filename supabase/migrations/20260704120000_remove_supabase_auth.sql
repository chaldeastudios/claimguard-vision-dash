-- Removing Supabase Auth entirely: signing in now means picking one of the
-- branded institution cards (a row in `organizations`) and proving you
-- belong to it with real openIMIS credentials, verified live against
-- openIMIS's own tokenAuth mutation (see src/lib/auth-session.server.ts
-- and src/lib/auth.functions.ts) -- not a per-person Supabase account.
--
-- There is no more individual user identity to key rows by, so every
-- column that referenced auth.users(id) is loosened to a plain text field
-- (still populated, just with the openIMIS username instead of a uuid, and
-- with no FK to enforce), and the old per-user `profiles` table -- whose
-- only job was holding that identity plus a personal logo -- is dropped.
-- Branding now lives directly on `organizations`, one row per institution
-- card, shared by whoever signs into it (see src/lib/organization-logo.ts).
--
-- Everything now goes through the service-role client
-- (src/integrations/supabase/client.server.ts), which bypasses RLS
-- entirely, so the existing "authenticated"-scoped policies below are
-- simply unreachable rather than actively wrong -- left in place rather
-- than rewritten, since there's no more anon/authenticated Supabase client
-- anywhere in the app for them to matter to.

ALTER TABLE public.claim_risk_analysis
  DROP CONSTRAINT IF EXISTS claim_risk_analysis_created_by_fkey;
ALTER TABLE public.claim_risk_analysis
  ALTER COLUMN created_by TYPE text USING created_by::text;
COMMENT ON COLUMN public.claim_risk_analysis.created_by IS
  'openIMIS username of whoever ran the analysis -- informational only, no FK.';

ALTER TABLE public.claim_insurer_assignment
  DROP CONSTRAINT IF EXISTS claim_insurer_assignment_assigned_by_fkey;
ALTER TABLE public.claim_insurer_assignment
  ALTER COLUMN assigned_by TYPE text USING assigned_by::text;
COMMENT ON COLUMN public.claim_insurer_assignment.assigned_by IS
  'openIMIS username of the hospital staffer who submitted the claim -- informational only, no FK.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles;
