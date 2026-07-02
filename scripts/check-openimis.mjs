// Diagnostic script: verifies the ClaimGuard dashboard container can reach
// openIMIS's GraphQL API, authenticate, and run the claims query the
// dashboard actually uses (src/lib/openimis.server.ts). Run from inside the
// claimguard-dash container so it uses the real container-network env vars:
//
//   docker-compose exec claimguard-dash node scripts/check-openimis.mjs

const url = process.env.OPENIMIS_GRAPHQL_URL;
const username = process.env.OPENIMIS_USERNAME;
const password = process.env.OPENIMIS_PASSWORD;

// Must match USER_AGENT_CSRF_BYPASS in docker-compose.yml -- see
// openimis.server.ts for why this is needed.
const USER_AGENT = "ClaimGuard-Dashboard";

console.log("OPENIMIS_GRAPHQL_URL:", url || "(not set)");
console.log("OPENIMIS_USERNAME:", username || "(not set)");
console.log("OPENIMIS_PASSWORD:", password ? "(set, hidden)" : "(not set)");

if (!url || !username || !password) {
  console.error("\nMissing one or more required env vars. Check .env and docker-compose.yml.");
  process.exit(1);
}

console.log("\n--- Step 1: connectivity + tokenAuth ---");
let token;
try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({
      query: `mutation($u: String!, $p: String!) { tokenAuth(username: $u, password: $p) { token } }`,
      variables: { u: username, p: password },
    }),
  });
  console.log("HTTP status:", res.status);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("\nResponse was not JSON -- likely a Django error page. First 2000 chars:\n");
    console.error(text.slice(0, 2000));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
  token = json?.data?.tokenAuth?.token;
} catch (err) {
  console.error(`\nCould not reach ${url} from inside this container.`);
  console.error("Error:", err.message);
  process.exit(1);
}

if (!token) {
  console.error("\nReached openIMIS, but auth failed -- no token returned.");
  console.error("Check OPENIMIS_USERNAME/OPENIMIS_PASSWORD.");
  process.exit(1);
}

console.log("\n--- Step 2: claims query (same shape as openimis.server.ts) ---");
try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      query: `query($first: Int) {
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
      }`,
      variables: { first: 5 },
    }),
  });
  console.log("HTTP status:", res.status);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("\nResponse was not JSON -- likely a Django error page. First 2000 chars:\n");
    console.error(text.slice(0, 2000));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
  if (json.errors) {
    console.error("\nGraphQL returned errors -- likely a field-name mismatch in openimis.server.ts.");
    process.exit(1);
  }
  const count = json?.data?.claims?.edges?.length ?? 0;
  console.log(`\n${count} claim(s) returned.`);
} catch (err) {
  console.error("\nNetwork error on claims query -", err.message);
  process.exit(1);
}
