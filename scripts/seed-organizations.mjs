// Seeds the six hospital + six insurer "institution cards" shown on the
// /auth/hospital and /auth/insurer sign-in pickers. There are no more
// per-person accounts to seed -- signing in means picking one of these
// cards and then authenticating with a real openIMIS username/password
// (see src/lib/auth-session.server.ts) -- so this only needs to create
// `organizations` rows.
//
// Hospital facility uuids are looked up live from openIMIS by facility
// code (matching scripts/seed_hospitals.py's HOSPITALS list) instead of
// being pasted in by hand -- one less manual, error-prone step. Run this
// after scripts/seed_hospitals.py:
//
//   node --env-file=.env scripts/seed-organizations.mjs
//
// Needs from .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// OPENIMIS_USERNAME, OPENIMIS_PASSWORD. OPENIMIS_GRAPHQL_URL defaults to
// http://localhost:8000/api/graphql (the backend service's host-mapped
// port in docker-compose.yml) since this runs outside Docker.

import { createClient } from "@supabase/supabase-js";

// Codes must match scripts/seed_hospitals.py's HOSPITALS list.
const HOSPITALS = [
  { name: "Kenyatta National Hospital", code: "KNH901" },
  { name: "Aga Khan University Hospital", code: "AKU902" },
  { name: "Nakuru Level 5 Hospital", code: "NKR903" },
  { name: "Moi Teaching and Referral Hospital", code: "MTRH904" },
  { name: "Coast General Teaching and Referral Hospital", code: "CGTRH905" },
  { name: "Mater Misericordiae Hospital", code: "MMH906" },
];

// Insurers aren't openIMIS entities -- no facility to link.
const INSURERS = [
  { name: "SHA" },
  { name: "AAR Insurance" },
  { name: "CIC Insurance" },
  { name: "Jubilee Health Insurance" },
  { name: "Britam" },
  { name: "Madison Insurance" },
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in the environment (check .env).`);
  return v;
}

const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- openIMIS: look up each hospital's facility uuid by code ---

async function openimisAuth() {
  const url = process.env.OPENIMIS_GRAPHQL_URL || "http://localhost:8000/api/graphql";
  const username = requireEnv("OPENIMIS_USERNAME");
  const password = requireEnv("OPENIMIS_PASSWORD");
  const userAgent = "ClaimGuard-Dashboard";

  const authRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": userAgent },
    body: JSON.stringify({
      query: `mutation TokenAuth($username: String!, $password: String!) {
        tokenAuth(username: $username, password: $password) { token }
      }`,
      variables: { username, password },
    }),
  });
  const authJson = await authRes.json();
  const token = authJson?.data?.tokenAuth?.token;
  if (!token)
    throw new Error(`openIMIS auth failed: ${JSON.stringify(authJson?.errors ?? authJson)}`);
  return { url, token, userAgent };
}

// `code` as a healthFacilities filter arg is unverified against this live
// deployment (openIMIS's graphene-django filtering conventionally exposes
// exact-match filters for scalar fields like this, matching the already-
// confirmed `uuid` filter used elsewhere) -- if it's wrong this returns no
// match and the hospital is skipped with a clear message below, rather
// than silently linking the wrong facility.
async function fetchFacilityUuidByCode({ url, token, userAgent }, code) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      query: `query HealthFacility($code: String!) {
        healthFacilities(code: $code, first: 1) { edges { node { uuid code } } }
      }`,
      variables: { code },
    }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`openIMIS query failed: ${JSON.stringify(json.errors)}`);
  return json.data?.healthFacilities?.edges?.[0]?.node?.uuid ?? null;
}

async function upsertOrganization(type, name, facilityUuid) {
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("type", type)
    .eq("name", name)
    .maybeSingle();
  if (existing) {
    if (facilityUuid) {
      await supabase.from("organizations").update({ facility_uuid: facilityUuid }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({ type, name, facility_uuid: facilityUuid ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  console.log("Creating insurer institutions...");
  for (const insurer of INSURERS) {
    const orgId = await upsertOrganization("insurer", insurer.name, null);
    console.log(`  ${insurer.name} -> ${orgId}`);
  }

  console.log("\nLooking up hospital facility uuids from openIMIS...");
  const openimis = await openimisAuth();

  console.log("\nCreating hospital institutions...");
  for (const hospital of HOSPITALS) {
    const facilityUuid = await fetchFacilityUuidByCode(openimis, hospital.code);
    if (!facilityUuid) {
      console.log(
        `  SKIPPED ${hospital.name} (${hospital.code}) -- no matching HealthFacility in openIMIS. Run scripts/seed_hospitals.py first.`,
      );
      continue;
    }
    const orgId = await upsertOrganization("hospital", hospital.name, facilityUuid);
    console.log(`  ${hospital.name} -> ${orgId} (facility ${facilityUuid})`);
  }

  console.log(
    "\nDone. Each card signs in with a real openIMIS username/password -- there are no separate ClaimGuard credentials to distribute.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
