// Policy/Premium-specific openIMIS queries. See openimis-client.server.ts
// for the shared auth/fetch plumbing this builds on.

import { graphqlRequest, confirmMutation, MAX_PAGE_SIZE } from "./openimis-client.server";

export interface Policy {
  id: string; // openIMIS policy uuid
  productCode: string;
  productName: string;
  status: string;
  value: number;
  enrollDate: string | null;
  startDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  familyId: string | null;
  familyHeadName: string | null;
}

export interface Premium {
  id: string; // openIMIS premium uuid
  amount: number;
  payDate: string | null;
  payType: string | null;
  receipt: string | null;
  payerName: string | null;
}

interface PolicyNode {
  uuid: string;
  status: number | null;
  value: number | string | null;
  enrollDate: string | null;
  startDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  product: { code: string | null; name: string | null } | null;
  family: {
    uuid: string | null;
    headInsuree: { lastName: string | null; otherNames: string | null } | null;
  } | null;
}

interface PremiumNode {
  uuid: string;
  amount: number | string | null;
  payDate: string | null;
  payType: string | null;
  receipt: string | null;
  payer: { name: string | null } | null;
}

const POLICY_FIELDS = `
  uuid
  status
  value
  enrollDate
  startDate
  effectiveDate
  expiryDate
  product { code name }
  family { uuid headInsuree { lastName otherNames } }
`;

const PREMIUM_FIELDS = `
  uuid
  amount
  payDate
  payType
  receipt
  payer { name }
`;

// openIMIS Policy.status (openimis-be-policy_py convention).
const STATUS_LABELS: Record<number, string> = {
  1: "idle",
  2: "active",
  4: "suspended",
  8: "expired",
};

function mapPolicy(node: PolicyNode): Policy {
  const familyHeadName = node.family?.headInsuree
    ? [node.family.headInsuree.otherNames, node.family.headInsuree.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null
    : null;
  return {
    id: node.uuid,
    productCode: node.product?.code ?? "",
    productName: node.product?.name ?? "Unknown product",
    status: node.status != null ? (STATUS_LABELS[node.status] ?? String(node.status)) : "unknown",
    value: Number(node.value) || 0,
    enrollDate: node.enrollDate,
    startDate: node.startDate,
    effectiveDate: node.effectiveDate,
    expiryDate: node.expiryDate,
    familyId: node.family?.uuid ?? null,
    familyHeadName,
  };
}

function mapPremium(node: PremiumNode): Premium {
  return {
    id: node.uuid,
    amount: Number(node.amount) || 0,
    payDate: node.payDate,
    payType: node.payType,
    receipt: node.receipt,
    payerName: node.payer?.name ?? null,
  };
}

export async function getOpenimisPolicy(uuid: string): Promise<Policy | null> {
  const query = `
    query Policy($uuid: String!) {
      policies(uuid: $uuid, first: 1) {
        edges { node { ${POLICY_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ policies: { edges: { node: PolicyNode }[] } }>(query, {
    uuid,
  });
  const node = data.policies?.edges?.[0]?.node;
  return node ? mapPolicy(node) : null;
}

export async function getOpenimisPoliciesByFamily(familyUuid: string): Promise<Policy[]> {
  const query = `
    query PoliciesByFamily($familyUuid: String!, $first: Int) {
      policiesByFamily(familyUuid: $familyUuid, first: $first) {
        edges { node { ${POLICY_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ policiesByFamily: { edges: { node: PolicyNode }[] } }>(
    query,
    {
      familyUuid,
      first: MAX_PAGE_SIZE,
    },
  );
  return (data.policiesByFamily?.edges ?? []).map((e) => mapPolicy(e.node));
}

export async function getOpenimisPremiumsByPolicy(policyUuid: string): Promise<Premium[]> {
  const query = `
    query PremiumsByPolicy($policyUuid: String!, $first: Int) {
      premiums(policy_Uuid: $policyUuid, first: $first) {
        edges { node { ${PREMIUM_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<{ premiums: { edges: { node: PremiumNode }[] } }>(query, {
    policyUuid,
    first: MAX_PAGE_SIZE,
  });
  return (data.premiums?.edges ?? []).map((e) => mapPremium(e.node));
}

export interface UpdatePremiumInput {
  uuid: string;
  policyUuid: string;
  amount: number;
  receipt: string | null;
  payDate: string | null;
  payType: string | null;
}

export type CreatePremiumInput = Omit<UpdatePremiumInput, "uuid">;

// Unlike Policy (productId/familyId/officerId: Int!), Premium/Contribution
// needs no integer ids at all -- policyUuid is a plain string and we
// already have it from the read side, so create+update are both fully
// buildable without further introspection.
const CREATE_PREMIUM_MUTATION = `
  mutation CreatePremium($input: CreatePremiumMutationInput!) {
    createPremium(input: $input) { clientMutationId }
  }
`;

const UPDATE_PREMIUM_MUTATION = `
  mutation UpdatePremium($input: UpdatePremiumMutationInput!) {
    updatePremium(input: $input) { clientMutationId }
  }
`;

export async function createOpenimisPremium(input: CreatePremiumInput): Promise<void> {
  const clientMutationId = crypto.randomUUID();
  await graphqlRequest(CREATE_PREMIUM_MUTATION, {
    input: {
      clientMutationId,
      policyUuid: input.policyUuid,
      amount: input.amount,
      receipt: input.receipt,
      payDate: input.payDate,
      payType: input.payType,
    },
  });
  await confirmMutation(clientMutationId);
}

export async function updateOpenimisPremium(input: UpdatePremiumInput): Promise<void> {
  const clientMutationId = crypto.randomUUID();
  await graphqlRequest(UPDATE_PREMIUM_MUTATION, {
    input: {
      clientMutationId,
      uuid: input.uuid,
      policyUuid: input.policyUuid,
      amount: input.amount,
      receipt: input.receipt,
      payDate: input.payDate,
      payType: input.payType,
    },
  });
  await confirmMutation(clientMutationId);
}
