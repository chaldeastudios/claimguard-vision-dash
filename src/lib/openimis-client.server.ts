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
