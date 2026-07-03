// Family/Insuree-specific openIMIS queries. See openimis-client.server.ts
// for the shared auth/fetch plumbing this builds on.

import { graphqlRequest, MAX_PAGE_SIZE } from "./openimis-client.server";

export interface Family {
  id: string; // openIMIS family uuid
  headName: string;
  headChfId: string;
  location: string;
  address: string;
  poverty: boolean;
  confirmationNo: string;
}

export interface Insuree {
  id: string; // openIMIS insuree uuid
  chfId: string;
  name: string;
  lastName: string;
  otherNames: string;
  dob: string | null;
  gender: string | null; // "M" | "F" | null
  head: boolean;
  phone: string | null;
  email: string | null;
  village: string | null;
  familyId: string | null;
}

interface FamilyNode {
  uuid: string;
  headInsuree: { chfId: string | null; lastName: string | null; otherNames: string | null } | null;
  location: { name: string | null } | null;
  address: string | null;
  poverty: boolean | null;
  confirmationNo: string | null;
}

interface InsureeNode {
  uuid: string;
  chfId: string;
  lastName: string;
  otherNames: string;
  dob: string | null;
  gender: { code: string | null } | null;
  head: boolean | null;
  phone: string | null;
  email: string | null;
  currentVillage: { name: string | null } | null;
  family: { uuid: string | null } | null;
}

const FAMILY_FIELDS = `
  uuid
  headInsuree { chfId lastName otherNames }
  location { name }
  address
  poverty
  confirmationNo
`;

const INSUREE_FIELDS = `
  uuid
  chfId
  lastName
  otherNames
  dob
  gender { code }
  head
  phone
  email
  currentVillage { name }
  family { uuid }
`;

function mapFamily(node: FamilyNode): Family {
  const headName =
    [node.headInsuree?.otherNames, node.headInsuree?.lastName].filter(Boolean).join(" ").trim() ||
    "Unknown head of household";
  return {
    id: node.uuid,
    headName,
    headChfId: node.headInsuree?.chfId ?? "—",
    location: node.location?.name ?? "Unknown location",
    address: node.address ?? "",
    poverty: node.poverty ?? false,
    confirmationNo: node.confirmationNo ?? "",
  };
}

function mapInsuree(node: InsureeNode): Insuree {
  return {
    id: node.uuid,
    chfId: node.chfId,
    name: [node.otherNames, node.lastName].filter(Boolean).join(" ").trim() || "Unknown",
    lastName: node.lastName,
    otherNames: node.otherNames,
    dob: node.dob,
    gender: node.gender?.code ?? null,
    head: node.head ?? false,
    phone: node.phone,
    email: node.email,
    village: node.currentVillage?.name ?? null,
    familyId: node.family?.uuid ?? null,
  };
}

export async function getOpenimisFamilies(): Promise<Family[]> {
  const query = `
    query Families($first: Int) {
      families(first: $first) {
        edges { node { ${FAMILY_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ families: { edges: { node: FamilyNode }[] } }>(query, {
    first: MAX_PAGE_SIZE,
  });
  return (data.families?.edges ?? []).map((e) => mapFamily(e.node));
}

export async function getOpenimisFamily(uuid: string): Promise<Family | null> {
  const query = `
    query Family($uuid: String!) {
      families(uuid: $uuid, first: 1) {
        edges { node { ${FAMILY_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ families: { edges: { node: FamilyNode }[] } }>(query, {
    uuid,
  });
  const node = data.families?.edges?.[0]?.node;
  return node ? mapFamily(node) : null;
}

export async function getOpenimisFamilyMembers(familyUuid: string): Promise<Insuree[]> {
  const query = `
    query FamilyMembers($familyUuid: String!, $first: Int) {
      familyMembers(familyUuid: $familyUuid, first: $first) {
        edges { node { ${INSUREE_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ familyMembers: { edges: { node: InsureeNode }[] } }>(query, {
    familyUuid,
    first: MAX_PAGE_SIZE,
  });
  return (data.familyMembers?.edges ?? []).map((e) => mapInsuree(e.node));
}

export async function getOpenimisInsurees(): Promise<Insuree[]> {
  const query = `
    query Insurees($first: Int) {
      insurees(first: $first) {
        edges { node { ${INSUREE_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ insurees: { edges: { node: InsureeNode }[] } }>(query, {
    first: MAX_PAGE_SIZE,
  });
  return (data.insurees?.edges ?? []).map((e) => mapInsuree(e.node));
}

export async function getOpenimisInsuree(uuid: string): Promise<Insuree | null> {
  const query = `
    query Insuree($uuid: String!) {
      insurees(uuid: $uuid, first: 1) {
        edges { node { ${INSUREE_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ insurees: { edges: { node: InsureeNode }[] } }>(query, {
    uuid,
  });
  const node = data.insurees?.edges?.[0]?.node;
  return node ? mapInsuree(node) : null;
}
