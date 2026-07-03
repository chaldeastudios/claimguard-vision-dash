// Dumps the fields of one or more named GraphQL types (works for
// INPUT_OBJECT, OBJECT, and ENUM types). Use this before writing any
// mutation that takes a wrapped `input: XMutationInput!` argument --
// the root-level introspect-schema.mjs only shows that the arg exists and
// its type name, not what's inside it. Run from inside the claimguard-dash
// container:
//
//   docker-compose exec claimguard-dash node scripts/introspect-type.mjs CreateFamilyMutationInput CreateInsureeMutationInput ...

const url = process.env.OPENIMIS_GRAPHQL_URL;
const username = process.env.OPENIMIS_USERNAME;
const password = process.env.OPENIMIS_PASSWORD;
const USER_AGENT = "ClaimGuard-Dashboard";

const typeNames = process.argv.slice(2);
if (typeNames.length === 0) {
  console.error("Usage: node scripts/introspect-type.mjs <TypeName> [<TypeName2> ...]");
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

const TYPE_QUERY = `
  query TypeInfo($name: String!) {
    __type(name: $name) {
      name
      kind
      inputFields {
        name
        type { kind name ofType { kind name ofType { kind name } } }
      }
      fields {
        name
        type { kind name ofType { kind name ofType { kind name } } }
      }
      enumValues { name }
    }
  }
`;

for (const name of typeNames) {
  const res = await gql(TYPE_QUERY, { name }, token);
  const t = res?.data?.__type;
  console.log(`=== ${name} ===`);
  if (!t) {
    console.log("  NOT FOUND (check spelling/exact type name)");
    console.log();
    continue;
  }
  console.log(`  kind: ${t.kind}`);
  if (t.inputFields) {
    for (const f of t.inputFields) console.log(`  ${f.name}: ${typeName(f.type)}`);
  }
  if (t.fields) {
    for (const f of t.fields) console.log(`  ${f.name}: ${typeName(f.type)}`);
  }
  if (t.enumValues) {
    for (const v of t.enumValues) console.log(`  ${v.name}`);
  }
  console.log();
}
