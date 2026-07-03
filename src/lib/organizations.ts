import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getOpenimisHealthFacility, type HealthFacility } from "./healthfacility.server";

export interface OrganizationSummary {
  id: string;
  name: string;
  logoUrl: string | null;
}

// The insurer directory a hospital picks from when submitting a claim.
export const fetchInsurerOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrganizationSummary[]> => {
    const { data, error } = await context.supabase
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
export const fetchHospitalOrgContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HospitalOrgContext> => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.organization_id) {
      return { organizationId: null, name: null, logoUrl: null, facility: null };
    }

    const { data: org, error: orgError } = await context.supabase
      .from("organizations")
      .select("id, name, logo_url, facility_uuid")
      .eq("id", profile.organization_id)
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
// convention as claim_risk_analysis.
export const assignClaimToInsurer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => AssignClaimInput.parse(data))
  .handler(async ({ data, context }): Promise<void> => {
    const { error } = await context.supabase.from("claim_insurer_assignment").insert({
      claim_uuid: data.claimUuid,
      insurer_organization_id: data.insurerOrganizationId,
      assigned_by: context.userId,
    });
    if (error) throw error;
  });
