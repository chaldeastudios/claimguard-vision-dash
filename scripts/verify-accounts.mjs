// Checks whether the organizations, demo login accounts, and claim->insurer
// backfill created by scripts/seed-accounts.mjs are still in Supabase.
//
//   node --env-file=.env scripts/verify-accounts.mjs
//
// If anything is reported MISSING, scripts/seed-accounts.mjs is safe to
// re-run -- upsertOrganization/ensureAccount only create what's actually
// missing and leave existing rows untouched.

import { createClient } from "@supabase/supabase-js";

const EXPECTED_ORGS = [
  {
    type: "insurer",
    name: "SHA",
    accounts: ["sha.reviewer1@claimguard.demo", "sha.reviewer2@claimguard.demo"],
  },
  {
    type: "insurer",
    name: "AAR Insurance",
    accounts: ["aar.reviewer1@claimguard.demo", "aar.reviewer2@claimguard.demo"],
  },
  {
    type: "hospital",
    name: "Kenyatta National Hospital",
    accounts: ["knh.clerk1@claimguard.demo", "knh.clerk2@claimguard.demo"],
  },
  {
    type: "hospital",
    name: "Aga Khan University Hospital",
    accounts: ["aku.clerk1@claimguard.demo", "aku.clerk2@claimguard.demo"],
  },
  {
    type: "hospital",
    name: "Nakuru Level 5 Hospital",
    accounts: ["nkr.clerk1@claimguard.demo", "nkr.clerk2@claimguard.demo"],
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

async function main() {
  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, type, name, facility_uuid");
  if (orgsError) throw orgsError;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("email, organization_id");
  if (profilesError) throw profilesError;

  const { count: assignmentCount, error: assignmentError } = await supabase
    .from("claim_insurer_assignment")
    .select("*", { count: "exact", head: true });
  if (assignmentError) throw assignmentError;

  console.log("=== Organizations & demo accounts ===");
  let missing = false;
  for (const expected of EXPECTED_ORGS) {
    const org = orgs.find((o) => o.type === expected.type && o.name === expected.name);
    if (!org) {
      console.log(`  MISSING organization: ${expected.name} (${expected.type})`);
      missing = true;
      continue;
    }
    const orgProfileEmails = new Set(
      profiles.filter((p) => p.organization_id === org.id).map((p) => p.email),
    );
    const missingAccounts = expected.accounts.filter((e) => !orgProfileEmails.has(e));
    if (missingAccounts.length === 0) {
      console.log(`  OK      ${expected.name} -> ${org.id} (${expected.accounts.length} accounts)`);
    } else {
      console.log(
        `  PARTIAL ${expected.name} -> missing account(s): ${missingAccounts.join(", ")}`,
      );
      missing = true;
    }
    if (expected.type === "hospital" && !org.facility_uuid) {
      console.log(`          (warning: no facility_uuid linked on this org)`);
    }
  }

  console.log();
  console.log(`=== Claim -> insurer assignments ===`);
  console.log(`  ${assignmentCount ?? 0} claim(s) tagged to an insurer.`);

  console.log();
  console.log(
    missing
      ? "Some data is missing -- re-run scripts/seed-accounts.mjs."
      : "All demo data is present.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
