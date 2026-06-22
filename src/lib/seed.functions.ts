import { createServerFn } from "@tanstack/react-start";
import { claims as mockClaims } from "./claims-data";

/**
 * Idempotently seeds the claims table from the deterministic mock dataset.
 * Safe to call multiple times — upserts by claim id.
 */
export const seedClaims = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count, error: countErr } = await supabaseAdmin
    .from("claims")
    .select("id", { count: "exact", head: true });
  if (countErr) throw countErr;
  if ((count ?? 0) >= mockClaims.length) {
    return { seeded: 0, total: count ?? 0 };
  }

  const rows = mockClaims.map((c) => ({
    id: c.id,
    patient: c.patient,
    patient_id: c.patientId,
    facility: c.facility,
    diagnosis_code: c.diagnosisCode,
    diagnosis: c.diagnosis,
    services: c.services,
    amount: c.amount,
    risk_score: c.riskScore,
    risk_level: c.riskLevel,
    submitted_at: c.submittedAt,
    reasons: c.reasons as unknown as Record<string, unknown>[],
  }));

  const { error } = await supabaseAdmin.from("claims").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return { seeded: rows.length, total: rows.length };
});
