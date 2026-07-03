import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  getOpenimisClaims,
  getOpenimisClaim,
  type Claim,
  type ClaimDetail,
} from "./openimis.server";
import type { Database } from "@/integrations/supabase/types";

export type RiskLevel = "High" | "Medium" | "Low";
export interface FraudReason {
  title: string;
  detail: string;
}

export type AnalysisRow = Database["public"]["Tables"]["claim_risk_analysis"]["Row"];

export type { Claim, ClaimDetail };
export interface ClaimWithAnalysis extends Claim {
  analysis: AnalysisRow | null;
}

// Claims themselves live in openIMIS -- this fetches them live over GraphQL
// (server-side only, see openimis.server.ts) and merges in ClaimGuard's own
// risk analyses from Supabase, keyed by openIMIS claim uuid.
//
// Insurer accounts linked to an organization only see claims a hospital
// tagged to that insurer at submission time (claim_insurer_assignment).
// Accounts with no organization_id (legacy reviewer accounts, or a
// self-signed-up insurer account with nothing assigned yet) see everything,
// matching pre-multi-tenant behavior rather than showing an empty queue.
export const fetchClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClaimWithAnalysis[]> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();

    const [claims, { data: analyses, error }, assignedUuids] = await Promise.all([
      getOpenimisClaims(),
      context.supabase
        .from("claim_risk_analysis")
        .select("*")
        .order("created_at", { ascending: false }),
      profile?.organization_id
        ? context.supabase
            .from("claim_insurer_assignment")
            .select("claim_uuid")
            .eq("insurer_organization_id", profile.organization_id)
            .then(({ data }) => new Set((data ?? []).map((r) => r.claim_uuid)))
        : Promise.resolve<Set<string> | null>(null),
    ]);
    if (error) throw error;
    const latestByClaim = new Map<string, AnalysisRow>();
    for (const a of analyses ?? []) {
      if (!latestByClaim.has(a.claim_id)) latestByClaim.set(a.claim_id, a);
    }
    const scoped = assignedUuids ? claims.filter((c) => assignedUuids.has(c.id)) : claims;
    return scoped.map((c) => ({ ...c, analysis: latestByClaim.get(c.id) ?? null }));
  });

const FetchClaimInput = z.object({ claimId: z.string().min(1) });

export const fetchClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => FetchClaimInput.parse(data))
  .handler(async ({ data }): Promise<ClaimDetail | null> => getOpenimisClaim(data.claimId));

export async function fetchLatestAnalysis(claimId: string): Promise<AnalysisRow | null> {
  const { data, error } = await supabase
    .from("claim_risk_analysis")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function fmtKES(n: number): string {
  return "KES " + n.toLocaleString("en-KE");
}
