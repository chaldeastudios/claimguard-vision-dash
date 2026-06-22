import { createServerFn } from "@tanstack/react-start";
import { claims as mockClaims } from "./claims-data";
import type { Json } from "@/integrations/supabase/types";

/**
 * Idempotently seeds the claims table with OpenIMIS-equivalent claim data,
 * and pre-populates claim_risk_analysis with heuristic/demo analyses so the
 * dashboard has populated risk data on first load. Safe to re-run.
 */
export const seedClaims = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count, error: countErr } = await supabaseAdmin
    .from("claims")
    .select("id", { count: "exact", head: true });
  if (countErr) throw countErr;

  let seededClaims = 0;
  if ((count ?? 0) < mockClaims.length) {
    const rows = mockClaims.map((c) => ({
      id: c.id,
      patient: c.patient,
      patient_id: c.patientId,
      facility: c.facility,
      diagnosis_code: c.diagnosisCode,
      diagnosis: c.diagnosis,
      services: c.services,
      amount: c.amount,
      submitted_at: c.submittedAt,
    }));
    const { error } = await supabaseAdmin.from("claims").upsert(rows, { onConflict: "id" });
    if (error) throw error;
    seededClaims = rows.length;
  }

  // Seed initial heuristic analyses for claims that don't have one yet
  const { data: existingAnalyses } = await supabaseAdmin
    .from("claim_risk_analysis")
    .select("claim_id");
  const analyzed = new Set((existingAnalyses ?? []).map((a) => a.claim_id));

  const toAnalyze = mockClaims.filter((c) => !analyzed.has(c.id));
  if (toAnalyze.length > 0) {
    const analyses = toAnalyze.map((c) => ({
      claim_id: c.id,
      model: "seed/heuristic-v1",
      summary: `Initial heuristic scoring based on amount, diagnosis, and facility patterns. Run AI analysis for a deeper review.`,
      risk_score: c.riskScore,
      risk_level: c.riskLevel,
      reasons: c.reasons as unknown as Json,
      recommendation:
        c.riskLevel === "High" ? "investigate" : c.riskLevel === "Medium" ? "investigate" : "approve",
    }));
    const { error } = await supabaseAdmin.from("claim_risk_analysis").insert(analyses);
    if (error) throw error;
  }

  return { seededClaims, seededAnalyses: toAnalyze.length };
});
