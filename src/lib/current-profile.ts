import { getCurrentSession } from "@/lib/auth.functions";

export interface CurrentProfile {
  username: string;
  organizationName: string;
  logoUrl: string | null;
}

// Shared query key so any successful write to the org's branding (e.g.
// uploading a new logo in Settings) can invalidate this and have the
// dashboard header/sidebar pick up the change immediately.
export const CURRENT_PROFILE_QUERY_KEY = ["current-profile"];

// Everything here now comes straight out of the session (see
// auth-session.server.ts) -- no more per-user profiles table to look up.
export async function fetchCurrentProfile(): Promise<CurrentProfile | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  return {
    username: session.openimisUsername,
    organizationName: session.organizationName,
    logoUrl: session.logoUrl,
  };
}
