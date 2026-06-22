export type RiskLevel = "High" | "Medium" | "Low";

export interface FraudReason {
  title: string;
  detail: string;
}

export interface Claim {
  id: string;
  patient: string;
  patientId: string;
  facility: string;
  diagnosisCode: string;
  diagnosis: string;
  services: string[];
  amount: number; // KES
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  submittedAt: string; // ISO
  reasons: FraudReason[];
}

const facilities = [
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

const patients = [
  ["Wanjiku Kamau", "P-100481"],
  ["Brian Otieno", "P-100482"],
  ["Faith Mwende", "P-100483"],
  ["Joseph Kiprono", "P-100484"],
  ["Aisha Hassan", "P-100485"],
  ["Mercy Achieng", "P-100486"],
  ["David Njoroge", "P-100487"],
  ["Grace Wambui", "P-100488"],
  ["Samuel Mutiso", "P-100489"],
  ["Esther Chebet", "P-100490"],
  ["Peter Omondi", "P-100491"],
  ["Lydia Nyambura", "P-100492"],
  ["Kevin Maina", "P-100493"],
  ["Janet Akinyi", "P-100494"],
  ["Daniel Kibet", "P-100495"],
  ["Naomi Adhiambo", "P-100496"],
  ["Stephen Mwangi", "P-100497"],
  ["Caroline Wairimu", "P-100498"],
  ["Anthony Barasa", "P-100499"],
  ["Pauline Cherono", "P-100500"],
];

const diagnoses: Array<[string, string, string[]]> = [
  ["J06.9", "Acute upper respiratory infection", ["Consultation", "Amoxicillin 500mg", "Lab: CBC"]],
  ["A09", "Acute gastroenteritis", ["Consultation", "ORS", "IV Fluids"]],
  ["I10", "Essential hypertension", ["Consultation", "Amlodipine 5mg", "ECG"]],
  ["E11.9", "Type 2 diabetes mellitus", ["Consultation", "Metformin", "HbA1c"]],
  ["O80", "Normal spontaneous delivery", ["Delivery", "Postnatal care", "Ward bed x2"]],
  ["S52.5", "Fracture distal radius", ["X-ray", "Cast application", "Analgesia"]],
  ["K35.8", "Acute appendicitis", ["Appendectomy", "Anesthesia", "Ward x3"]],
  ["B50.9", "Plasmodium falciparum malaria", ["Consultation", "Coartem", "Lab: BS"]],
  ["N39.0", "Urinary tract infection", ["Consultation", "Nitrofurantoin", "Urinalysis"]],
  ["J18.9", "Pneumonia, unspecified", ["Admission x4", "Ceftriaxone IV", "Chest X-ray"]],
];

function seeded(i: number) {
  // deterministic pseudo-random
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], i: number): T {
  return arr[Math.floor(seeded(i) * arr.length)];
}

function buildReasons(c: Omit<Claim, "reasons">, idx: number): FraudReason[] {
  const r: FraudReason[] = [];
  if (c.riskLevel === "High") {
    r.push({
      title: "Claim amount significantly above peer median",
      detail: `Submitted amount is ${(2 + seeded(idx) * 3).toFixed(1)}x the national median for ${c.diagnosisCode} (${c.diagnosis}).`,
    });
    if (idx % 3 === 0) {
      r.push({
        title: "Cross-facility pattern detected",
        detail: `Patient ${c.patient} (${c.patientId}) has claims at 3 different facilities within the past 14 days.`,
      });
    }
    if (idx % 4 === 0) {
      r.push({
        title: "Service–diagnosis mismatch",
        detail: `Billed services include procedures not clinically indicated for ${c.diagnosis}.`,
      });
    }
    r.push({
      title: "Provider outlier behavior",
      detail: `${c.facility} submitted 4.1x its usual daily claim volume on this date.`,
    });
  } else if (c.riskLevel === "Medium") {
    r.push({
      title: "Amount above expected range",
      detail: `Claim is in the top 15% by value for diagnosis ${c.diagnosisCode}.`,
    });
    r.push({
      title: "Unusual submission timing",
      detail: `Submitted as part of a batch of 27 claims within a 6-minute window from the same facility.`,
    });
  } else {
    r.push({
      title: "Within expected parameters",
      detail: `Amount, services, and submission pattern match historical norms for this diagnosis and facility.`,
    });
  }
  return r;
}

function makeClaim(i: number): Claim {
  const [name, pid] = pick(patients, i);
  const facility = pick(facilities, i + 7);
  const [code, dx, services] = pick(diagnoses, i + 3);
  const r = seeded(i + 1);
  let riskScore: number;
  let riskLevel: RiskLevel;
  if (r < 0.18) {
    riskScore = 78 + Math.floor(seeded(i + 11) * 22);
    riskLevel = "High";
  } else if (r < 0.42) {
    riskScore = 50 + Math.floor(seeded(i + 13) * 25);
    riskLevel = "Medium";
  } else {
    riskScore = 5 + Math.floor(seeded(i + 17) * 40);
    riskLevel = "Low";
  }
  const baseAmount =
    code === "O80" || code === "K35.8" || code === "J18.9"
      ? 35000 + seeded(i + 19) * 160000
      : 800 + seeded(i + 23) * 8000;
  const inflate = riskLevel === "High" ? 2.4 + seeded(i + 29) : 1;
  const amount = Math.round((baseAmount * inflate) / 50) * 50;

  const days = Math.floor(seeded(i + 31) * 21);
  const hours = Math.floor(seeded(i + 37) * 24);
  const submittedAt = new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();

  const partial: Omit<Claim, "reasons"> = {
    id: `CLM-${(20240 + i).toString()}`,
    patient: name,
    patientId: pid,
    facility,
    diagnosisCode: code,
    diagnosis: dx,
    services,
    amount,
    riskScore,
    riskLevel,
    submittedAt,
  };
  return { ...partial, reasons: buildReasons(partial, i) };
}

export const claims: Claim[] = Array.from({ length: 52 }, (_, i) => makeClaim(i)).sort(
  (a, b) => b.riskScore - a.riskScore,
);

export const facilitiesList = facilities;

export function fmtKES(n: number): string {
  return "KES " + n.toLocaleString("en-KE");
}

export function getClaim(id: string): Claim | undefined {
  return claims.find((c) => c.id === id);
}

// Aggregates
export const totalValueAtRisk = claims
  .filter((c) => c.riskLevel !== "Low")
  .reduce((s, c) => s + c.amount, 0);
export const highRiskCount = claims.filter((c) => c.riskLevel === "High").length;
export const mediumRiskCount = claims.filter((c) => c.riskLevel === "Medium").length;
export const lowRiskCount = claims.filter((c) => c.riskLevel === "Low").length;
export const avgRiskScore = Math.round(
  claims.reduce((s, c) => s + c.riskScore, 0) / claims.length,
);
