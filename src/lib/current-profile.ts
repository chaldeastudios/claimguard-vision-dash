import { supabase } from "@/integrations/supabase/client";

export interface CurrentProfile {
  userId: string;
  name: string | null;
  email: string | null;
  logoUrl: string | null;
}

// Shared query key so any successful write to the profile (e.g. uploading a
// new organization logo in Settings) can invalidate this and have the
// dashboard header/sidebar pick up the change immediately.
export const CURRENT_PROFILE_QUERY_KEY = ["current-profile"];

export async function fetchCurrentProfile(): Promise<CurrentProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const u = userData.user;
  if (!u) return null;

  const { data: row } = await supabase
    .from("profiles")
    .select("full_name, logo_url")
    .eq("id", u.id)
    .maybeSingle();

  const name =
    (u.user_metadata?.full_name as string) ||
    (u.user_metadata?.name as string) ||
    row?.full_name ||
    null;

  return { userId: u.id, name, email: u.email ?? null, logoUrl: row?.logo_url ?? null };
}
