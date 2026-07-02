// Server-only client for openIMIS's GraphQL API. Talks directly to the
// Django backend over the internal Docker network (SITE_ROOT=api/ registers
// GraphQL at /api/graphql -- see docker-compose.yml) using django-graphql-jwt
// auth. This must stay server-side: it needs the internal `backend:8000`
// hostname (unreachable from a browser) and an openIMIS service-account
// password that can't be shipped to the client bundle.

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

let tokenCache: { token: string; obtainedAt: number } | null = null;
const TOKEN_TTL_MS = 5 * 60 * 1000;

function getConfig() {
  const url = process.env.OPENIMIS_GRAPHQL_URL;
  const username = process.env.OPENIMIS_USERNAME;
  const password = process.env.OPENIMIS_PASSWORD;
  if (!url || !username || !password) {
    throw new Error(
      "Missing OPENIMIS_GRAPHQL_URL / OPENIMIS_USERNAME / OPENIMIS_PASSWORD environment variable(s). Set them in your .env file.",
    );
  }
  return { url, username, password };
}

async function authenticate(): Promise<string> {
  const { url, username, password } = getConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation TokenAuth($username: String!, $password: String!) {
        tokenAuth(username: $username, password: $password) { token }
      }`,
      variables: { username, password },
    }),
  });
  const json = await res.json();
  const token = json?.data?.tokenAuth?.token;
  if (!token) {
    throw new Error(`openIMIS auth failed: ${JSON.stringify(json?.errors ?? json)}`);
  }
  tokenCache = { token, obtainedAt: Date.now() };
  return token;
}

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.obtainedAt < TOKEN_TTL_MS) {
    return tokenCache.token;
  }
  return authenticate();
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { url } = getConfig();
  const doFetch = (token: string) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `JWT ${token}` },
      body: JSON.stringify({ query, variables }),
    });

  let token = await getToken();
  let res = await doFetch(token);
  if (res.status === 401 || res.status === 403) {
    // Local token cache may be stale relative to the server's own expiry -- re-auth once.
    tokenCache = null;
    token = await getToken();
    res = await doFetch(token);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`openIMIS GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

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

// openIMIS's claims connection caps `first` at 100 server-side (Graphene-Django's
// max_limit) -- requesting more throws a GraphQL error instead of clamping.
const MAX_PAGE_SIZE = 100;

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
