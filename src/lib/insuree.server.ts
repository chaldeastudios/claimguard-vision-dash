// Family/Insuree-specific openIMIS queries. See openimis-client.server.ts
// for the shared auth/fetch plumbing this builds on.

import { graphqlRequest, confirmMutation, MAX_PAGE_SIZE } from "./openimis-client.server";

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

export interface UpdateInsureeInput {
  uuid: string;
  chfId: string;
  lastName: string;
  otherNames: string;
  gender: string; // "M" | "F" -- Gender.code, confirmed via GENDER_LABELS in the detail view
  dob: string; // ISO date
  head: boolean;
  phone: string | null;
  email: string | null;
  currentAddress: string | null;
}

export type CreateInsureeInput = Omit<UpdateInsureeInput, "uuid">;

// UpdateInsureeMutationInput requires the full record (lastName/otherNames/
// genderId/dob), not a partial patch -- openIMIS's InsureeService applies
// each field it's given via setattr, so fields we simply omit here
// (familyId, currentVillageId, ...) are left untouched rather than cleared.
const UPDATE_INSUREE_MUTATION = `
  mutation UpdateInsuree($input: UpdateInsureeMutationInput!) {
    updateInsuree(input: $input) { clientMutationId }
  }
`;

// CreateInsureeMutationInput's familyId is optional -- omitting it creates
// a standalone insuree not attached to any household. Attaching to a
// specific family needs that family's raw integer id, which our reads only
// expose as a uuid -- not wired up here yet.
const CREATE_INSUREE_MUTATION = `
  mutation CreateInsuree($input: CreateInsureeMutationInput!) {
    createInsuree(input: $input) { clientMutationId }
  }
`;

export interface UpdateFamilyInput {
  uuid: string;
  address: string | null;
  poverty: boolean;
  confirmationNo: string | null;
}

export type CreateFamilyInput = Omit<UpdateFamilyInput, "uuid">;

// UpdateFamilyMutationInput has no required fields beyond the id -- omitting
// locationId/headInsuree keeps this out of integer-id/nested-type territory
// we haven't confirmed yet (see updateOpenimisInsuree's comment on the same
// partial-update behavior).
const UPDATE_FAMILY_MUTATION = `
  mutation UpdateFamily($input: UpdateFamilyMutationInput!) {
    updateFamily(input: $input) { clientMutationId }
  }
`;

// CreateFamilyMutationInput has the same field set, also with nothing
// required per the schema -- but a family with no location/head insuree may
// still get rejected by openIMIS's own business validation. If so,
// confirmMutation surfaces that as a real error instead of a silent no-op.
const CREATE_FAMILY_MUTATION = `
  mutation CreateFamily($input: CreateFamilyMutationInput!) {
    createFamily(input: $input) { clientMutationId }
  }
`;

export async function updateOpenimisFamily(input: UpdateFamilyInput): Promise<void> {
  const clientMutationId = crypto.randomUUID();
  await graphqlRequest(UPDATE_FAMILY_MUTATION, {
    input: {
      clientMutationId,
      uuid: input.uuid,
      address: input.address,
      poverty: input.poverty,
      confirmationNo: input.confirmationNo,
    },
  });
  await confirmMutation(clientMutationId);
}

export async function createOpenimisFamily(input: CreateFamilyInput): Promise<void> {
  const clientMutationId = crypto.randomUUID();
  await graphqlRequest(CREATE_FAMILY_MUTATION, {
    input: {
      clientMutationId,
      address: input.address,
      poverty: input.poverty,
      confirmationNo: input.confirmationNo,
    },
  });
  await confirmMutation(clientMutationId);
}

export async function updateOpenimisInsuree(input: UpdateInsureeInput): Promise<void> {
  const clientMutationId = crypto.randomUUID();
  await graphqlRequest(UPDATE_INSUREE_MUTATION, {
    input: {
      clientMutationId,
      uuid: input.uuid,
      chfId: input.chfId,
      lastName: input.lastName,
      otherNames: input.otherNames,
      genderId: input.gender,
      dob: input.dob,
      head: input.head,
      phone: input.phone,
      email: input.email,
      currentAddress: input.currentAddress,
    },
  });
  await confirmMutation(clientMutationId);
}

export async function createOpenimisInsuree(input: CreateInsureeInput): Promise<void> {
  const clientMutationId = crypto.randomUUID();
  await graphqlRequest(CREATE_INSUREE_MUTATION, {
    input: {
      clientMutationId,
      chfId: input.chfId,
      lastName: input.lastName,
      otherNames: input.otherNames,
      genderId: input.gender,
      dob: input.dob,
      head: input.head,
      phone: input.phone,
      email: input.email,
      currentAddress: input.currentAddress,
    },
  });
  await confirmMutation(clientMutationId);
}
