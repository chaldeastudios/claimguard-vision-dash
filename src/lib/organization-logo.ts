import { supabase } from "@/integrations/supabase/client";

export const LOGO_BUCKET = "organization-logos";
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function logoPath(userId: string) {
  return `${userId}/logo`;
}

// Uploads to a path keyed by the account's own user ID (RLS on
// storage.objects enforces a user can only write inside their own folder --
// see supabase/migrations/20260703103321_organization_logo.sql) and stores
// the resulting public URL on that user's profiles row. There's no separate
// organizations table: one account, one logo, since this demo only ever
// runs one account at a time.
export async function uploadOrganizationLogo(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }

  const path = logoPath(userId);
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  // The object path is stable across re-uploads (upsert), so without a
  // cache-busting query param the browser/CDN would keep serving the
  // previous image after a replace.
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ logo_url: url })
    .eq("id", userId);
  if (updateError) throw updateError;

  return url;
}
