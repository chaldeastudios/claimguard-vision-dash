// Seeds the six hospital + six insurer "institution cards" shown on the
// /auth/hospital and /auth/insurer sign-in pickers. There are no more
// per-person accounts to seed -- signing in means picking one of these
// cards and then authenticating with a real openIMIS username/password
// (see src/lib/auth-session.server.ts) -- so this only needs to create
// `organizations` rows.
//
// Run from the host (after loading demo-data/seed.sql-equivalent facilities
// via scripts/seed_hospitals.py -- paste its printed uuids into HOSPITALS
// below first):
//
//   node --env-file=.env scripts/seed-organizations.mjs
//
// Needs from .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";

// Paste the uuids scripts/seed_hospitals.py printed for each facility.
const HOSPITALS = [
  { name: "Kenyatta National Hospital", facilityUuid: "REPLACE_WITH_KNH_UUID" },
  { name: "Aga Khan University Hospital", facilityUuid: "REPLACE_WITH_AKU_UUID" },
  { name: "Nakuru Level 5 Hospital", facilityUuid: "REPLACE_WITH_NKR_UUID" },
  { name: "Moi Teaching and Referral Hospital", facilityUuid: "REPLACE_WITH_MTRH_UUID" },
  { name: "Coast General Teaching and Referral Hospital", facilityUuid: "REPLACE_WITH_CGTRH_UUID" },
  { name: "Mater Misericordiae Hospital", facilityUuid: "REPLACE_WITH_MMH_UUID" },
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
  if (HOSPITALS.some((h) => h.facilityUuid.startsWith("REPLACE_WITH_"))) {
    throw new Error(
      "Edit HOSPITALS at the top of this script with the facility uuids scripts/seed_hospitals.py printed, then re-run.",
    );
  }

  console.log("Creating insurer institutions...");
  for (const insurer of INSURERS) {
    const orgId = await upsertOrganization("insurer", insurer.name, null);
    console.log(`  ${insurer.name} -> ${orgId}`);
  }

  console.log("\nCreating hospital institutions...");
  for (const hospital of HOSPITALS) {
    const orgId = await upsertOrganization("hospital", hospital.name, hospital.facilityUuid);
    console.log(`  ${hospital.name} -> ${orgId}`);
  }

  console.log(
    "\nDone. Each card signs in with a real openIMIS username/password -- there are no separate ClaimGuard credentials to distribute.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
