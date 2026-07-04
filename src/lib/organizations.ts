import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "./session-middleware";
import { getOpenimisHealthFacility, type HealthFacility } from "./healthfacility.server";

export interface HospitalOrgContext {
  organizationId: string | null;
  name: string | null;
  logoUrl: string | null;
  // The hospital's own facility, pre-resolved from organizations.facility_uuid
  // -- null if this account isn't linked to one yet, in which case the portal
  // falls back to letting staff pick a facility manually.
  facility: HealthFacility | null;
}

// Hospital institutions are hardcoded now (see institutions.ts) rather than
// Supabase-backed rows, so this only ever resolves a facility when a
// Supabase `organizations` row happens to exist with a matching id -- it
// degrades gracefully to `facility: null` otherwise, and the hospital
// portal falls back to a manual facility picker in that case.
export const fetchHospitalOrgContext = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .handler(async ({ context }): Promise<HospitalOrgContext> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, logo_url, facility_uuid")
      .eq("id", context.session.organizationId)
      .maybeSingle();
    if (orgError) throw orgError;
    if (!org) return { organizationId: null, name: null, logoUrl: null, facility: null };

    const facility = org.facility_uuid ? await getOpenimisHealthFacility(org.facility_uuid) : null;
    return { organizationId: org.id, name: org.name, logoUrl: org.logo_url, facility };
  });
