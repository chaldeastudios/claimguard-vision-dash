// Dumps a compact summary of every root Query and Mutation field openIMIS's
// GraphQL API exposes: name, args, and return type. Run from inside the
// claimguard-dash container (reuses its OPENIMIS_* env vars):
//
//   docker-compose exec claimguard-dash node scripts/introspect-schema.mjs

const url = process.env.OPENIMIS_GRAPHQL_URL;
const username = process.env.OPENIMIS_USERNAME;
const password = process.env.OPENIMIS_PASSWORD;
const USER_AGENT = "ClaimGuard-Dashboard";

function typeName(t) {
  if (!t) return "?";
  if (t.kind === "NON_NULL") return typeName(t.ofType) + "!";
  if (t.kind === "LIST") return "[" + typeName(t.ofType) + "]";
  return t.name || "?";
}

async function gql(query, variables, token) {
  const headers = { "Content-Type": "application/json", "User-Agent": USER_AGENT };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
  return res.json();
}

const authRes = await gql(
  `mutation($u: String!, $p: String!) { tokenAuth(username: $u, password: $p) { token } }`,
  { u: username, p: password },
);
const token = authRes?.data?.tokenAuth?.token;
if (!token) {
  console.error("Auth failed:", JSON.stringify(authRes));
  process.exit(1);
}

const INTROSPECTION = `
{
  __schema {
    queryType {
      fields {
        name
        args { name type { kind name ofType { kind name ofType { kind name } } } }
        type { kind name ofType { kind name ofType { kind name } } }
      }
    }
    mutationType {
      fields {
        name
        args { name type { kind name ofType { kind name ofType { kind name } } } }
        type { kind name ofType { kind name ofType { kind name } } }
      }
    }
  }
}`;

const res = await gql(INTROSPECTION, {}, token);
if (res.errors) {
  console.error("Introspection errors:", JSON.stringify(res.errors, null, 2));
  process.exit(1);
}

const { queryType, mutationType } = res.data.__schema;

console.log(`=== QUERIES (${queryType.fields.length}) ===`);
for (const f of queryType.fields.sort((a, b) => a.name.localeCompare(b.name))) {
  const args = f.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(", ");
  console.log(`${f.name}(${args}): ${typeName(f.type)}`);
}

console.log(`\n=== MUTATIONS (${mutationType.fields.length}) ===`);
for (const f of mutationType.fields.sort((a, b) => a.name.localeCompare(b.name))) {
  const args = f.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(", ");
  console.log(`${f.name}(${args}): ${typeName(f.type)}`);
}
