// Health Facility (hospital) openIMIS queries. See openimis-client.server.ts
// for the shared auth/fetch plumbing this builds on.

import { graphqlRequest, MAX_PAGE_SIZE } from "./openimis-client.server";

export interface HealthFacility {
  id: string; // openIMIS health facility uuid
  globalId: string | null; // opaque Relay id -- see decodeGlobalId in openimis-client.server.ts
  code: string;
  name: string;
  level: string | null;
  levelLabel: string;
  careType: string | null;
  careTypeLabel: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  legalForm: string | null;
  location: string | null;
  status: string | null;
}

interface HealthFacilityNode {
  id: string;
  uuid: string;
  code: string;
  name: string;
  level: string | null;
  careType: string | null;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  legalForm: { code: string | null; name: string | null } | null;
  location: { name: string | null } | null;
  status: string | null;
}

const HEALTH_FACILITY_FIELDS = `
  id
  uuid
  code
  name
  level
  careType
  address
  phone
  fax
  email
  legalForm { code name }
  location { name }
  status
`;

// openIMIS HealthFacility.level codes (openimis-be-location_py convention)
// -- unconfirmed via live introspection, flag if these read wrong.
const LEVEL_LABELS: Record<string, string> = {
  D: "Dispensary",
  C: "Health centre",
  H: "Hospital",
};

// Same caveat as LEVEL_LABELS.
const CARE_TYPE_LABELS: Record<string, string> = {
  I: "In-patient",
  O: "Out-patient",
  B: "In & out-patient",
};

function mapHealthFacility(node: HealthFacilityNode): HealthFacility {
  return {
    id: node.uuid,
    globalId: node.id ?? null,
    code: node.code,
    name: node.name,
    level: node.level,
    levelLabel: node.level ? (LEVEL_LABELS[node.level] ?? node.level) : "Unknown",
    careType: node.careType,
    careTypeLabel: node.careType ? (CARE_TYPE_LABELS[node.careType] ?? node.careType) : "Unknown",
    address: node.address,
    phone: node.phone,
    fax: node.fax,
    email: node.email,
    legalForm: node.legalForm?.name ?? node.legalForm?.code ?? null,
    location: node.location?.name ?? null,
    status: node.status,
  };
}

export async function getOpenimisHealthFacilities(): Promise<HealthFacility[]> {
  const query = `
    query HealthFacilities($first: Int) {
      healthFacilities(first: $first) {
        edges { node { ${HEALTH_FACILITY_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{
    healthFacilities: { edges: { node: HealthFacilityNode }[] };
  }>(query, { first: MAX_PAGE_SIZE });
  return (data.healthFacilities?.edges ?? []).map((e) => mapHealthFacility(e.node));
}

export async function getOpenimisHealthFacility(uuid: string): Promise<HealthFacility | null> {
  const query = `
    query HealthFacility($uuid: String!) {
      healthFacilities(uuid: $uuid, first: 1) {
        edges { node { ${HEALTH_FACILITY_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{
    healthFacilities: { edges: { node: HealthFacilityNode }[] };
  }>(query, { uuid });
  const node = data.healthFacilities?.edges?.[0]?.node;
  return node ? mapHealthFacility(node) : null;
}
