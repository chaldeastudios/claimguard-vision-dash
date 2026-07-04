import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSession } from "./session-middleware";
import { getOpenimisHealthFacility, type HealthFacility } from "./healthfacility.server";

export interface OrganizationSummary {
  id: string;
  name: string;
  logoUrl: string | null;
}

// The insurer directory a hospital picks from when submitting a claim.
export const fetchInsurerOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .handler(async (): Promise<OrganizationSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select("id, name, logo_url")
      .eq("type", "insurer")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((o) => ({ id: o.id, name: o.name, logoUrl: o.logo_url }));
  });

export interface HospitalOrgContext {
  organizationId: string | null;
  name: string | null;
  logoUrl: string | null;
  // The hospital's own facility, pre-resolved from organizations.facility_uuid
  // -- null if this account isn't linked to one yet, in which case the portal
  // falls back to letting staff pick a facility manually.
  facility: HealthFacility | null;
}

// The logged-in hospital account's own organization -- name/logo for the
// portal header, and its linked openIMIS facility (if any) so claim
// submission can default to it instead of asking staff to pick every time.
// The organization itself is already known from the session (which card was
// picked at login) -- no per-user profile lookup needed anymore.
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

const AssignClaimInput = z.object({
  claimUuid: z.string().min(1),
  insurerOrganizationId: z.string().min(1),
});

// Tags a just-submitted claim with the insurer the hospital chose. openIMIS
// has no field for this, so it lives here, keyed by claim uuid -- same join
// convention as claim_risk_analysis. Purely narrative for the demo -- every
// insurer account sees every claim regardless (see claims-api.ts), this
// just records which one the hospital said it was for.
export const assignClaimToInsurer = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => AssignClaimInput.parse(data))
  .handler(async ({ data, context }): Promise<void> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("claim_insurer_assignment").insert({
      claim_uuid: data.claimUuid,
      insurer_organization_id: data.insurerOrganizationId,
      assigned_by: context.session.openimisUsername,
    });
    if (error) throw error;
  });
