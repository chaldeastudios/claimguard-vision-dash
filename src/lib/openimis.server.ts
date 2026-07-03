// Claims-specific openIMIS queries. See openimis-client.server.ts for the
// shared auth/fetch plumbing this builds on.

import { graphqlRequest, MAX_PAGE_SIZE } from "./openimis-client.server";

export interface Claim {
  id: string; // openIMIS claim uuid -- the join key claim_risk_analysis.claim_id uses
  code: string; // human-readable claim code, e.g. CLM-2026-61545
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

interface OpenimisClaimNode {
  uuid: string;
  code: string;
  dateClaimed: string | null;
  dateFrom: string | null;
  claimed: number | string;
  status: number | null;
  insuree: { chfId: string | null; lastName: string | null; otherNames: string | null } | null;
  healthFacility: { name: string | null } | null;
  icd: { code: string | null; name: string | null } | null;
}

const CLAIMS_QUERY = `
  query Claims($first: Int) {
    claims(first: $first) {
      edges {
        node {
          uuid
          code
          dateClaimed
          dateFrom
          claimed
          status
          insuree { chfId lastName otherNames }
          healthFacility { name }
          icd { code name }
        }
      }
    }
  }
`;

// openIMIS's claim status bitmask (openimis-be-claim_py convention).
const STATUS_LABELS: Record<number, string> = {
  1: "entered",
  2: "checked",
  4: "processed",
  8: "valuated",
  16: "rejected",
};

function mapClaim(node: OpenimisClaimNode): Claim {
  const patient =
    [node.insuree?.otherNames, node.insuree?.lastName].filter(Boolean).join(" ").trim() ||
    "Unknown patient";
  return {
    id: node.uuid,
    code: node.code,
    patient,
    patientId: node.insuree?.chfId ?? "—",
    facility: node.healthFacility?.name ?? "Unknown facility",
    diagnosisCode: node.icd?.code ?? "",
    diagnosis: node.icd?.name ?? "",
    services: [],
    amount: Number(node.claimed) || 0,
    submittedAt: node.dateClaimed ?? node.dateFrom ?? new Date().toISOString(),
    status: node.status != null ? (STATUS_LABELS[node.status] ?? String(node.status)) : "unknown",
  };
}

export async function getOpenimisClaims(): Promise<Claim[]> {
  const data = await graphqlRequest<{ claims: { edges: { node: OpenimisClaimNode }[] } }>(
    CLAIMS_QUERY,
    { first: MAX_PAGE_SIZE },
  );
  return (data.claims?.edges ?? []).map((e) => mapClaim(e.node));
}

export async function getOpenimisClaim(uuid: string): Promise<Claim | null> {
  const claims = await getOpenimisClaims();
  return claims.find((c) => c.id === uuid) ?? null;
}
