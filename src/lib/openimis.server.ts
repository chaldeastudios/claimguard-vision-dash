// Claims-specific openIMIS queries. See openimis-client.server.ts for the
// shared auth/fetch plumbing this builds on.

import {
  graphqlRequest,
  confirmMutation,
  decodeGlobalId,
  MAX_PAGE_SIZE,
} from "./openimis-client.server";

export interface Claim {
  id: string; // openIMIS claim uuid -- the join key claim_risk_analysis.claim_id uses
  code: string; // human-readable claim code, e.g. CLM-2026-61545
  patient: string;
  patientId: string;
  insureeId: string | null; // for cross-linking to /dashboard/insurees/$insureeId
  familyId: string | null; // for cross-linking to /dashboard/families/$familyId
  facility: string;
  diagnosisCode: string;
  diagnosis: string;
  services: string[];
  amount: number;
  submittedAt: string;
  status: string;
}

export interface ClaimLineItem {
  code: string;
  name: string;
  kind: "item" | "service";
  quantityProvided: number | null;
  priceAsked: number | null;
  priceApproved: number | null;
}

export interface ClaimDetail extends Claim {
  category: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  dateProcessed: string | null;
  approved: number | null;
  valuated: number | null;
  reinsured: number | null;
  remunerated: number | null;
  visitType: string | null;
  careType: string | null;
  patientCondition: string | null;
  guaranteeId: string | null;
  referralCode: string | null;
  preAuthorization: boolean | null;
  explanation: string | null;
  adjustment: string | null;
  feedbackStatus: number | null;
  reviewStatus: number | null;
  approvalStatus: number | null;
  rejectionReason: number | null;
  otherDiagnoses: { code: string; name: string }[];
  lineItems: ClaimLineItem[];
}

interface InsureeRef {
  uuid: string | null;
  chfId: string | null;
  lastName: string | null;
  otherNames: string | null;
  family: { uuid: string | null } | null;
}

interface DiagnosisRef {
  code: string | null;
  name: string | null;
}

interface OpenimisClaimNode {
  uuid: string;
  code: string;
  dateClaimed: string | null;
  dateFrom: string | null;
  claimed: number | string;
  status: number | null;
  insuree: InsureeRef | null;
  healthFacility: { name: string | null } | null;
  icd: DiagnosisRef | null;
}

interface OpenimisClaimDetailNode extends OpenimisClaimNode {
  category: string | null;
  dateTo: string | null;
  dateProcessed: string | null;
  approved: number | string | null;
  valuated: number | string | null;
  reinsured: number | string | null;
  remunerated: number | string | null;
  visitType: string | null;
  careType: string | null;
  patientCondition: string | null;
  guaranteeId: string | null;
  referralCode: string | null;
  preAuthorization: boolean | null;
  explanation: string | null;
  adjustment: string | null;
  feedbackStatus: number | null;
  reviewStatus: number | null;
  approvalStatus: number | null;
  rejectionReason: number | null;
  icd1: DiagnosisRef | null;
  icd2: DiagnosisRef | null;
  icd3: DiagnosisRef | null;
  icd4: DiagnosisRef | null;
  // ClaimItemGQLType/ClaimServiceGQLType are plain lists, not Relay
  // connections -- no edges/node wrapping (confirmed live: querying edges
  // on them errors with "Cannot query field \"edges\"").
  items:
    | {
        item: DiagnosisRef | null;
        qtyProvided: number | string | null;
        priceAsked: number | string | null;
        priceApproved: number | string | null;
      }[]
    | null;
  services:
    | {
        service: DiagnosisRef | null;
        qtyProvided: number | string | null;
        priceAsked: number | string | null;
        priceApproved: number | string | null;
      }[]
    | null;
}

const CLAIM_NODE_FIELDS = `
  uuid
  code
  dateClaimed
  dateFrom
  claimed
  status
  insuree { uuid chfId lastName otherNames family { uuid } }
  healthFacility { name }
  icd { code name }
`;

const CLAIMS_QUERY = `
  query Claims($first: Int) {
    claims(first: $first) {
      edges {
        node { ${CLAIM_NODE_FIELDS} }
      }
    }
  }
`;

// Richer field set for the claim detail page only -- kept off the list
// query since it fetches nested item/service line items per claim.
const CLAIM_DETAIL_QUERY = `
  query ClaimDetail($uuid: String!) {
    claims(uuid: $uuid, first: 1) {
      edges {
        node {
          ${CLAIM_NODE_FIELDS}
          category
          dateTo
          dateProcessed
          approved
          valuated
          reinsured
          remunerated
          visitType
          careType
          patientCondition
          guaranteeId
          referralCode
          preAuthorization
          explanation
          adjustment
          feedbackStatus
          reviewStatus
          approvalStatus
          rejectionReason
          icd1 { code name }
          icd2 { code name }
          icd3 { code name }
          icd4 { code name }
          items {
            item { code name }
            qtyProvided
            priceAsked
            priceApproved
          }
          services {
            service { code name }
            qtyProvided
            priceAsked
            priceApproved
          }
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
    insureeId: node.insuree?.uuid ?? null,
    familyId: node.insuree?.family?.uuid ?? null,
    facility: node.healthFacility?.name ?? "Unknown facility",
    diagnosisCode: node.icd?.code ?? "",
    diagnosis: node.icd?.name ?? "",
    services: [],
    amount: Number(node.claimed) || 0,
    submittedAt: node.dateClaimed ?? node.dateFrom ?? new Date().toISOString(),
    status: node.status != null ? (STATUS_LABELS[node.status] ?? String(node.status)) : "unknown",
  };
}

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function mapClaimDetail(node: OpenimisClaimDetailNode): ClaimDetail {
  const base = mapClaim(node);

  const otherDiagnoses = [node.icd1, node.icd2, node.icd3, node.icd4]
    .filter((d): d is DiagnosisRef => !!d?.code)
    .map((d) => ({ code: d.code!, name: d.name ?? "" }));

  const lineItems: ClaimLineItem[] = [
    ...(node.items ?? [])
      .filter((n) => n.item?.code)
      .map((n) => ({
        code: n.item!.code!,
        name: n.item!.name ?? "",
        kind: "item" as const,
        quantityProvided: num(n.qtyProvided),
        priceAsked: num(n.priceAsked),
        priceApproved: num(n.priceApproved),
      })),
    ...(node.services ?? [])
      .filter((n) => n.service?.code)
      .map((n) => ({
        code: n.service!.code!,
        name: n.service!.name ?? "",
        kind: "service" as const,
        quantityProvided: num(n.qtyProvided),
        priceAsked: num(n.priceAsked),
        priceApproved: num(n.priceApproved),
      })),
  ];

  return {
    ...base,
    category: node.category,
    dateFrom: node.dateFrom,
    dateTo: node.dateTo,
    dateProcessed: node.dateProcessed,
    approved: num(node.approved),
    valuated: num(node.valuated),
    reinsured: num(node.reinsured),
    remunerated: num(node.remunerated),
    visitType: node.visitType,
    careType: node.careType,
    patientCondition: node.patientCondition,
    guaranteeId: node.guaranteeId,
    referralCode: node.referralCode,
    preAuthorization: node.preAuthorization,
    explanation: node.explanation,
    adjustment: node.adjustment,
    feedbackStatus: node.feedbackStatus,
    reviewStatus: node.reviewStatus,
    approvalStatus: node.approvalStatus,
    rejectionReason: node.rejectionReason,
    otherDiagnoses,
    lineItems,
  };
}

export async function getOpenimisClaims(): Promise<Claim[]> {
  const data = await graphqlRequest<{ claims: { edges: { node: OpenimisClaimNode }[] } }>(
    CLAIMS_QUERY,
    { first: MAX_PAGE_SIZE },
  );
  return (data.claims?.edges ?? []).map((e) => mapClaim(e.node));
}

export async function getOpenimisClaim(uuid: string): Promise<ClaimDetail | null> {
  const data = await graphqlRequest<{ claims: { edges: { node: OpenimisClaimDetailNode }[] } }>(
    CLAIM_DETAIL_QUERY,
    { uuid },
  );
  const node = data.claims?.edges?.[0]?.node;
  return node ? mapClaimDetail(node) : null;
}

export interface SubmitClaimLine {
  globalId: string; // opaque Relay id of a medicalItems/medicalServices catalog entry
  quantity: number;
  priceAsked: number;
}

export interface SubmitClaimInput {
  insureeGlobalId: string;
  healthFacilityGlobalId: string;
  icdGlobalId: string;
  dateFrom: string;
  dateClaimed: string;
  visitType: string | null;
  explanation: string | null;
  items: SubmitClaimLine[];
  services: SubmitClaimLine[];
}

// CreateClaimMutationInput isn't independently introspected -- inferred by
// mirroring the confirmed UpdateClaimMutationInput minus uuid, matching how
// every other entity in this schema (Family, Insuree, Policy, Premium) pairs
// its create/update inputs. ClaimCodeInputType turned out to be a plain
// string scalar despite the name, not a nested object.
const CREATE_CLAIM_MUTATION = `
  mutation CreateClaim($input: CreateClaimMutationInput!) {
    createClaim(input: $input) { clientMutationId }
  }
`;

function generateClaimCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `CLM-${year}-${rand}`;
}

function buildClaimLine(
  line: SubmitClaimLine,
  idField: "itemId" | "serviceId",
): Record<string, unknown> | null {
  const id = decodeGlobalId(line.globalId);
  if (id == null) return null;
  return {
    [idField]: id,
    status: 1, // best-effort default -- valid ClaimItem/ClaimService status codes unconfirmed
    qtyProvided: line.quantity,
    priceAsked: line.priceAsked,
  };
}

// Submits a claim on behalf of a hospital via the public claim portal (see
// dashboard.hospital-portal.tsx). insureeId/healthFacilityId/icdId/itemId/
// serviceId are all resolved from opaque Relay ids via decodeGlobalId --
// UNVERIFIED against this live deployment (see that function's comment). A
// wrong decode fails the whole mutation with a clear error rather than
// attaching the claim to the wrong record.
const CLAIM_UUID_BY_CODE_QUERY = `
  query ClaimUuidByCode($code: String!) {
    claims(code: $code, first: 1) {
      edges { node { uuid } }
    }
  }
`;

export async function createOpenimisClaim(
  input: SubmitClaimInput,
): Promise<{ code: string; uuid: string | null }> {
  const insureeId = decodeGlobalId(input.insureeGlobalId);
  const healthFacilityId = decodeGlobalId(input.healthFacilityGlobalId);
  const icdId = decodeGlobalId(input.icdGlobalId);
  if (insureeId == null || healthFacilityId == null || icdId == null) {
    throw new Error(
      "Could not resolve patient, facility, or diagnosis to an openIMIS record id -- the global-id decoding this relies on may not match this deployment.",
    );
  }

  const items = input.items
    .map((line) => buildClaimLine(line, "itemId"))
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const services = input.services
    .map((line) => buildClaimLine(line, "serviceId"))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const code = generateClaimCode();
  const clientMutationId = crypto.randomUUID();
  await graphqlRequest(CREATE_CLAIM_MUTATION, {
    input: {
      clientMutationId,
      code,
      autogenerate: false,
      insureeId,
      healthFacilityId,
      icdId,
      dateFrom: input.dateFrom,
      dateClaimed: input.dateClaimed,
      visitType: input.visitType,
      explanation: input.explanation,
      ...(items.length ? { items } : {}),
      ...(services.length ? { services } : {}),
    },
  });
  await confirmMutation(clientMutationId);

  // Best-effort -- the claim was already confirmed created above, so a
  // failure here just means the caller won't get a uuid to tag an insurer
  // assignment with, not a failed submission.
  let uuid: string | null = null;
  try {
    const lookup = await graphqlRequest<{ claims: { edges: { node: { uuid: string } }[] } }>(
      CLAIM_UUID_BY_CODE_QUERY,
      { code },
    );
    uuid = lookup.claims?.edges?.[0]?.node?.uuid ?? null;
  } catch {
    uuid = null;
  }

  return { code, uuid };
}
