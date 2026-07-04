// Checks whether the six hospital + six insurer institution cards created
// by scripts/seed-organizations.mjs are present in Supabase.
//
//   node --env-file=.env scripts/verify-organizations.mjs
//
// If anything is reported MISSING, scripts/seed-organizations.mjs is safe
// to re-run -- upsertOrganization only creates what's actually missing.

import { createClient } from "@supabase/supabase-js";

const EXPECTED_ORGS = [
  { type: "insurer", name: "SHA" },
  { type: "insurer", name: "AAR Insurance" },
  { type: "insurer", name: "CIC Insurance" },
  { type: "insurer", name: "Jubilee Health Insurance" },
  { type: "insurer", name: "Britam" },
  { type: "insurer", name: "Madison Insurance" },
  { type: "hospital", name: "Kenyatta National Hospital" },
  { type: "hospital", name: "Aga Khan University Hospital" },
  { type: "hospital", name: "Nakuru Level 5 Hospital" },
  { type: "hospital", name: "Moi Teaching and Referral Hospital" },
  { type: "hospital", name: "Coast General Teaching and Referral Hospital" },
  { type: "hospital", name: "Mater Misericordiae Hospital" },
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
    .select("id, type, name, logo_url, facility_uuid");
  if (orgsError) throw orgsError;

  console.log("=== Institution cards ===");
  let missing = false;
  for (const expected of EXPECTED_ORGS) {
    const org = orgs.find((o) => o.type === expected.type && o.name === expected.name);
    if (!org) {
      console.log(`  MISSING ${expected.name} (${expected.type})`);
      missing = true;
      continue;
    }
    console.log(`  OK      ${expected.name} -> ${org.id}${org.logo_url ? " (logo uploaded)" : ""}`);
    if (expected.type === "hospital" && !org.facility_uuid) {
      console.log(`          (warning: no facility_uuid linked on this org)`);
    }
  }

  console.log();
  console.log(
    missing
      ? "Some institutions are missing -- re-run scripts/seed-organizations.mjs."
      : "All demo institutions are present.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
