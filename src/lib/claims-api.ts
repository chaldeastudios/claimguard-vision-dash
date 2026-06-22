import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RiskLevel = "High" | "Medium" | "Low";
export interface FraudReason {
  title: string;
  detail: string;
}

export type ClaimRow = Database["public"]["Tables"]["claims"]["Row"];
export type AnalysisRow = Database["public"]["Tables"]["claim_risk_analysis"]["Row"];

export interface Claim {
  id: string;
  patient: string;
  patientId: string;
  facility: string;
  diagnosisCode: string;
  diagnosis: string;
  services: string[];
  amount: number;
  submittedAt: string;
  status: string;
}

export interface ClaimWithAnalysis extends Claim {
  analysis: AnalysisRow | null;
}

function rowToClaim(r: ClaimRow): Claim {
  return {
    id: r.id,
    patient: r.patient,
    patientId: r.patient_id,
    facility: r.facility,
    diagnosisCode: r.diagnosis_code,
    diagnosis: r.diagnosis,
    services: r.services ?? [],
    amount: r.amount,
    submittedAt: r.submitted_at,
    status: r.status,
  };
}

export async function fetchClaims(): Promise<ClaimWithAnalysis[]> {
  const [{ data: claims, error }, { data: analyses }] = await Promise.all([
    supabase.from("claims").select("*").order("submitted_at", { ascending: false }).limit(500),
    supabase
      .from("claim_risk_analysis")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  const latestByClaim = new Map<string, AnalysisRow>();
  for (const a of analyses ?? []) {
    if (!latestByClaim.has(a.claim_id)) latestByClaim.set(a.claim_id, a);
  }
  return (claims ?? []).map((c) => ({
    ...rowToClaim(c),
    analysis: latestByClaim.get(c.id) ?? null,
  }));
}

export async function fetchClaim(id: string): Promise<Claim | null> {
  const { data, error } = await supabase.from("claims").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToClaim(data) : null;
}

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
