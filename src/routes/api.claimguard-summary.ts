import { createFileRoute } from "@tanstack/react-router";
import { getOpenimisClaims } from "@/lib/openimis.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// Public, unauthenticated summary feed for the openIMIS home-page widget
// (openimis-claimguard-module's ClaimGuardHomeCard) -- that widget renders
// inside openIMIS's own authenticated shell on a different origin/port, so
// it can't carry a ClaimGuard reviewer session/cookie across. Demo-scoped
// deliberately: same claims data already visible to logged-in openIMIS
// staff, just pre-aggregated. Not gated behind Supabase auth like fetchClaims.
export const Route = createFileRoute("/api/claimguard-summary")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: CORS_HEADERS }),
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [claims, { data: analyses }] = await Promise.all([
          getOpenimisClaims(),
          supabaseAdmin
            .from("claim_risk_analysis")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        const latestByClaim = new Map<string, NonNullable<typeof analyses>[number]>();
        for (const a of analyses ?? []) {
          if (!latestByClaim.has(a.claim_id)) latestByClaim.set(a.claim_id, a);
        }

        const withAnalysis = claims.map((c) => ({ ...c, analysis: latestByClaim.get(c.id) ?? null }));
        const scored = withAnalysis.filter((c) => c.analysis);
        const high = scored.filter((c) => c.analysis?.risk_level === "High").length;
        const med = scored.filter((c) => c.analysis?.risk_level === "Medium").length;
        const low = scored.filter((c) => c.analysis?.risk_level === "Low").length;
        const valueAtRisk = scored
          .filter((c) => c.analysis?.risk_level !== "Low")
          .reduce((s, c) => s + c.amount, 0);

        const recentFlagged = withAnalysis
          .filter((c) => c.analysis && c.analysis.risk_level !== "Low")
          .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt))
          .slice(0, 6)
          .map((c) => ({
            uuid: c.id,
            code: c.code,
            patient: c.patient,
            facility: c.facility,
            amount: c.amount,
            riskLevel: c.analysis!.risk_level,
            riskScore: c.analysis!.risk_score,
            submittedAt: c.submittedAt,
          }));

        return Response.json(
          {
            totalClaims: claims.length,
            scoredClaims: scored.length,
            pendingClaims: claims.length - scored.length,
            high,
            medium: med,
            low,
            valueAtRisk,
            recentFlagged,
          },
          { headers: CORS_HEADERS },
        );
      },
    },
  },
});
