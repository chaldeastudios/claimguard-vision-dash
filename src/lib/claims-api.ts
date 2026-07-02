import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { getOpenimisClaims, getOpenimisClaim, type Claim } from "./openimis.server";
import type { Database } from "@/integrations/supabase/types";

export type RiskLevel = "High" | "Medium" | "Low";
export interface FraudReason {
  title: string;
  detail: string;
}

export type AnalysisRow = Database["public"]["Tables"]["claim_risk_analysis"]["Row"];

export type { Claim };
export interface ClaimWithAnalysis extends Claim {
  analysis: AnalysisRow | null;
}

// Claims themselves live in openIMIS -- this fetches them live over GraphQL
// (server-side only, see openimis.server.ts) and merges in ClaimGuard's own
// risk analyses from Supabase, keyed by openIMIS claim uuid.
export const fetchClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClaimWithAnalysis[]> => {
    const [claims, { data: analyses, error }] = await Promise.all([
      getOpenimisClaims(),
      context.supabase
        .from("claim_risk_analysis")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (error) throw error;
    const latestByClaim = new Map<string, AnalysisRow>();
    for (const a of analyses ?? []) {
      if (!latestByClaim.has(a.claim_id)) latestByClaim.set(a.claim_id, a);
    }
    return claims.map((c) => ({ ...c, analysis: latestByClaim.get(c.id) ?? null }));
  });

const FetchClaimInput = z.object({ claimId: z.string().min(1) });

export const fetchClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => FetchClaimInput.parse(data))
  .handler(async ({ data }): Promise<Claim | null> => getOpenimisClaim(data.claimId));

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

export const facilitiesList = [
  "Kenyatta National Hospital",
  "Aga Khan University Hospital",
  "Nakuru Level 5 Hospital",
  "Mater Misericordiae Hospital",
  "Moi Teaching and Referral Hospital",
  "Coast General Hospital",
  "Gertrude's Children's Hospital",
  "Karen Hospital",
  "MP Shah Hospital",
  "Avenue Hospital Kisumu",
];
