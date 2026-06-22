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
  riskScore: number;
  riskLevel: RiskLevel;
  submittedAt: string;
  reasons: FraudReason[];
  status: string;
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
    riskScore: r.risk_score,
    riskLevel: r.risk_level as RiskLevel,
    submittedAt: r.submitted_at,
    reasons: (r.reasons as unknown as FraudReason[]) ?? [],
    status: r.status,
  };
}

export async function fetchClaims(): Promise<Claim[]> {
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .order("risk_score", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(rowToClaim);
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
