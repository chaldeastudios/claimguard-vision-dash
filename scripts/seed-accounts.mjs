// Seeds the multi-tenant hospital/insurer accounts feature: creates the
// insurer + hospital organizations, a couple of demo login accounts for
// each, and backfills existing openIMIS claims onto the two insurers so
// their queues aren't empty on first login.
//
// Run from the host (after loading demo-data/seed.sql equivalent facilities
// via scripts/seed_hospitals.py -- paste its printed uuids into HOSPITALS
// below first):
//
//   node --env-file=.env scripts/seed-accounts.mjs
//
// Needs from .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// OPENIMIS_USERNAME, OPENIMIS_PASSWORD. OPENIMIS_GRAPHQL_URL defaults to
// http://localhost:8000/api/graphql (the backend service's host-mapped
// port in docker-compose.yml) since this runs outside Docker.

import { createClient } from "@supabase/supabase-js";

const DEMO_PASSWORD = "ClaimGuard2026!";

// Paste the uuids scripts/seed_hospitals.py printed for each facility.
const HOSPITALS = [
  {
    name: "Kenyatta National Hospital",
    facilityUuid: "REPLACE_WITH_KNH_UUID",
    accounts: ["knh.clerk1@claimguard.demo", "knh.clerk2@claimguard.demo"],
  },
  {
    name: "Aga Khan University Hospital",
    facilityUuid: "REPLACE_WITH_AKU_UUID",
    accounts: ["aku.clerk1@claimguard.demo", "aku.clerk2@claimguard.demo"],
  },
  {
    name: "Nakuru Level 5 Hospital",
    facilityUuid: "REPLACE_WITH_NKR_UUID",
    accounts: ["nkr.clerk1@claimguard.demo", "nkr.clerk2@claimguard.demo"],
  },
];

const INSURERS = [
  { name: "SHA", accounts: ["sha.reviewer1@claimguard.demo", "sha.reviewer2@claimguard.demo"] },
  {
    name: "AAR Insurance",
    accounts: ["aar.reviewer1@claimguard.demo", "aar.reviewer2@claimguard.demo"],
  },
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in the environment (check .env).`);
  return v;
}

const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertOrganization(type, name, facilityUuid) {
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("type", type)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("organizations")
    .insert({ type, name, facility_uuid: facilityUuid ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureAccount(email, fullName, accountType, organizationId) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  let userId;
  if (error) {
    // Already exists from a previous run -- look it up instead of failing.
    const { data: list, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    const found = list.users.find((u) => u.email === email);
    if (!found) throw error;
    userId = found.id;
  } else {
    userId = created.user.id;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      account_type: accountType,
      organization_id: organizationId,
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;
  return userId;
}

// --- openIMIS backfill: tag existing claims onto the two insurers so their
// queues have something to review immediately, round-robin since there's no
// real signal yet for which insurer a pre-existing claim "belongs" to. ---

async function fetchOpenimisClaims() {
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

  const claimsRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      query: `query { claims(first: 100) { edges { node { uuid } } } }`,
    }),
  });
  const claimsJson = await claimsRes.json();
  if (claimsJson.errors)
    throw new Error(`openIMIS claims query failed: ${JSON.stringify(claimsJson.errors)}`);
  return (claimsJson.data?.claims?.edges ?? []).map((e) => e.node.uuid);
}

async function backfillClaimAssignments(insurerOrgIds) {
  let claimUuids;
  try {
    claimUuids = await fetchOpenimisClaims();
  } catch (err) {
    console.warn(`Skipping claim backfill -- couldn't reach openIMIS: ${err.message}`);
    return;
  }
  if (claimUuids.length === 0) {
    console.log("No existing openIMIS claims found to backfill.");
    return;
  }
  const rows = claimUuids.map((claim_uuid, i) => ({
    claim_uuid,
    insurer_organization_id: insurerOrgIds[i % insurerOrgIds.length],
  }));
  const { error } = await supabase
    .from("claim_insurer_assignment")
    .upsert(rows, { onConflict: "claim_uuid" });
  if (error) throw error;
  console.log(
    `Backfilled ${rows.length} existing claim(s) across ${insurerOrgIds.length} insurer(s).`,
  );
}

async function main() {
  if (HOSPITALS.some((h) => h.facilityUuid.startsWith("REPLACE_WITH_"))) {
    throw new Error(
      "Edit HOSPITALS at the top of this script with the facility uuids scripts/seed_hospitals.py printed, then re-run.",
    );
  }

  console.log("Creating organizations...");
  const insurerOrgIds = [];
  for (const insurer of INSURERS) {
    const orgId = await upsertOrganization("insurer", insurer.name, null);
    insurerOrgIds.push(orgId);
    for (const [i, email] of insurer.accounts.entries()) {
      await ensureAccount(email, `${insurer.name} Reviewer ${i + 1}`, "insurer", orgId);
    }
    console.log(`  ${insurer.name} -> ${orgId} (${insurer.accounts.length} accounts)`);
  }

  for (const hospital of HOSPITALS) {
    const orgId = await upsertOrganization("hospital", hospital.name, hospital.facilityUuid);
    for (const [i, email] of hospital.accounts.entries()) {
      await ensureAccount(email, `${hospital.name} Clerk ${i + 1}`, "hospital", orgId);
    }
    console.log(`  ${hospital.name} -> ${orgId} (${hospital.accounts.length} accounts)`);
  }

  console.log("\nBackfilling existing claims onto insurers...");
  await backfillClaimAssignments(insurerOrgIds);

  console.log("\nDone. Demo login credentials (password for all: " + DEMO_PASSWORD + "):");
  for (const org of [...INSURERS, ...HOSPITALS]) {
    for (const email of org.accounts) console.log(`  ${email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
