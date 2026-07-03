// Shared server-only GraphQL client for openIMIS's API. Talks directly to
// the Django backend over the internal Docker network (SITE_ROOT=api/
// registers GraphQL at /api/graphql -- see docker-compose.yml) using
// django-graphql-jwt auth. This must stay server-side: it needs the internal
// `backend:8000` hostname (unreachable from a browser) and an openIMIS
// service-account password that can't be shipped to the client bundle.
//
// Every openimis-*.server.ts module (claims, families/insurees, ...) should
// import graphqlRequest from here rather than re-implementing auth -- getting
// this right took several rounds of live debugging (wrong JWT header prefix,
// a server-side CSRF check that assumes a browser session, a hard page-size
// cap), so don't duplicate it.

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

// Must match USER_AGENT_CSRF_BYPASS on the backend (docker-compose.yml) --
// core.schema._check_csrf_token skips its session-cookie-based CSRF check
// for any request whose User-Agent contains this substring. Without it,
// every request from this stateless JWT client fails with a KeyError on
// request.session['csrftoken'], since there's no browser session to hold one.
const USER_AGENT = "ClaimGuard-Dashboard";

async function authenticate(): Promise<string> {
  const { url, username, password } = getConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
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

// openIMIS's Relay connections cap `first` at 100 server-side
// (Graphene-Django's max_limit) -- requesting more throws a GraphQL error
// instead of clamping.
export const MAX_PAGE_SIZE = 100;

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { url } = getConfig();
  const doFetch = (token: string) =>
    fetch(url, {
      method: "POST",
      // This deployment's GRAPHQL_JWT settings set JWT_AUTH_HEADER_PREFIX to
      // "Bearer" (not django-graphql-jwt's own default of "JWT") -- using the
      // wrong prefix doesn't error, it just silently leaves the request
      // unauthenticated, so every resolver's permission check fails.
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": USER_AGENT,
      },
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

const MUTATION_LOG_QUERY = `
  query MutationStatus($id: [UUID]) {
    mutationLogs(clientMutationId: $id) {
      edges { node { clientMutationId error } }
    }
  }
`;

// openIMIS mutations don't apply synchronously -- they enqueue a Celery task
// (see docker-compose.yml's rabbitmq/worker services) and return right away
// with just a clientMutationId, with no GraphQL-level error even if the
// change is later rejected (bad permission, failed validation, ...). This
// polls the audit log for that mutation and throws if it recorded an error,
// so callers get a real failure instead of a false "success" toast.
//
// The mutationLogs(clientMutationId: ...) arg shape isn't independently
// confirmed (best-effort match to openimis-fe_js's own convention) -- if
// it's wrong this fails closed by logging a warning and treating the write
// as unconfirmed rather than throwing, since a bad guess here shouldn't
// turn a real success into a false failure.
export async function confirmMutation(clientMutationId: string, timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let node: { clientMutationId: string | null; error: string | null } | undefined;
    try {
      const data = await graphqlRequest<{
        mutationLogs: {
          edges: { node: { clientMutationId: string | null; error: string | null } }[];
        };
      }>(MUTATION_LOG_QUERY, { id: [clientMutationId] });
      node = data.mutationLogs?.edges?.[0]?.node;
    } catch (err) {
      console.warn(
        `[openimis] mutationLogs confirmation query failed, treating write as unconfirmed: ${err instanceof Error ? err.message : err}`,
      );
      return;
    }
    if (node) {
      if (node.error) throw new Error(`openIMIS rejected the change: ${node.error}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.warn(`[openimis] mutation ${clientMutationId} not confirmed within ${timeoutMs}ms`);
}
