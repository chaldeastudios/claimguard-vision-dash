import { createServerFn } from "@tanstack/react-start";

export interface PublicBranding {
  name: string | null;
  logoUrl: string | null;
}

// Public (unauthenticated) branding lookup for the hospital claim portal,
// which hospital staff use without a ClaimGuard reviewer session -- so it
// can't read `profiles` the normal way (RLS restricts SELECT to
// auth.uid() = id, and there's no auth.uid() for an anonymous request).
// Uses the service-role client instead, which bypasses RLS. This assumes a
// single account/institution, matching how the org-logo feature itself was
// scoped ("we'll only be using one account to demonstrate").
export const fetchPublicBranding = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicBranding> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("full_name, logo_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return { name: data?.full_name ?? null, logoUrl: data?.logo_url ?? null };
  },
);
