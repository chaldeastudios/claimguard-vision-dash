-- Organization branding logo. Deliberately NOT a separate organizations
-- table -- this app only demos a single account per institution, so the
-- account itself stands in for "the organization": one logo per user,
-- stored as a column on the existing per-user profiles table.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url text;

-- Public bucket for uploaded logo images. Public so the dashboard/sidebar
-- <img> tag can load it directly without a signed URL round-trip; write
-- access is still locked down by the policies below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos', 'organization-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access to organization logos" ON storage.objects;
CREATE POLICY "Public read access to organization logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-logos');

-- Object path convention is "<user id>/logo" -- these policies restrict
-- writes to a user's own folder, matched against auth.uid(), even though
-- the bucket itself is public-read.
DROP POLICY IF EXISTS "Users can upload their own organization logo" ON storage.objects;
CREATE POLICY "Users can upload their own organization logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own organization logo" ON storage.objects;
CREATE POLICY "Users can update their own organization logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own organization logo" ON storage.objects;
CREATE POLICY "Users can delete their own organization logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
