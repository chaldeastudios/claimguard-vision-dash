import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "./session-middleware";
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
// Every insurer account sees every claim regardless of which institution
// card was used to sign in -- this is a demo of the product, not a
// real multi-tenant deployment, and every account is meant to show the
// same populated queue (see auth-session.server.ts).
export const fetchClaims = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .handler(async (): Promise<ClaimWithAnalysis[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [claims, { data: analyses, error }] = await Promise.all([
      getOpenimisClaims(),
      supabaseAdmin
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
  .middleware([requireSession])
  .inputValidator((data) => FetchClaimInput.parse(data))
  .handler(async ({ data }): Promise<ClaimDetail | null> => getOpenimisClaim(data.claimId));

const FetchAnalysisInput = z.object({ claimId: z.string().min(1) });

export const fetchLatestAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSession])
  .inputValidator((data) => FetchAnalysisInput.parse(data))
  .handler(async ({ data }): Promise<AnalysisRow | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("claim_risk_analysis")
      .select("*")
      .eq("claim_id", data.claimId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export function fmtKES(n: number): string {
  return "KES " + n.toLocaleString("en-KE");
}
