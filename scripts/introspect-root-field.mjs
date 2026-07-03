// Dumps a root Query field's argument list (name + type), which
// introspect-type.mjs doesn't cover -- that one only shows a named type's
// own fields, not what filter arguments a root query field like
// `mutationLogs(...)` accepts. Run from inside the claimguard-dash container:
//
//   docker-compose exec claimguard-dash node scripts/introspect-root-field.mjs mutationLogs

const url = process.env.OPENIMIS_GRAPHQL_URL;
const username = process.env.OPENIMIS_USERNAME;
const password = process.env.OPENIMIS_PASSWORD;
const USER_AGENT = "ClaimGuard-Dashboard";

const fieldNames = process.argv.slice(2);
if (fieldNames.length === 0) {
  console.error("Usage: node scripts/introspect-root-field.mjs <fieldName> [<fieldName2> ...]");
  process.exit(1);
}

function typeName(t) {
  if (!t) return "?";
  if (t.kind === "NON_NULL") return typeName(t.ofType) + "!";
  if (t.kind === "LIST") return "[" + typeName(t.ofType) + "]";
  return t.name || "?";
}

async function gql(query, variables, token) {
  const headers = { "Content-Type": "application/json", "User-Agent": USER_AGENT };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
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

const SCHEMA_QUERY = `
  query RootFields {
    __schema {
      queryType {
        fields {
          name
          type { kind name ofType { kind name } }
          args {
            name
            type { kind name ofType { kind name ofType { kind name } } }
          }
        }
      }
    }
  }
`;

const res = await gql(SCHEMA_QUERY, {}, token);
const fields = res?.data?.__schema?.queryType?.fields ?? [];

for (const wanted of fieldNames) {
  const f = fields.find((x) => x.name === wanted);
  console.log(`=== ${wanted} ===`);
  if (!f) {
    console.log("  NOT FOUND (check spelling/exact field name)");
    console.log();
    continue;
  }
  console.log(`  returns: ${typeName(f.type)}`);
  for (const a of f.args) console.log(`  arg ${a.name}: ${typeName(a.type)}`);
  console.log();
}
