import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAppSession, type AccountType, type AppSession } from "./auth-session.server";
import { verifyOpenimisCredentials } from "./openimis-client.server";

export interface OrganizationOption {
  id: string;
  name: string;
  logoUrl: string | null;
}

// TEMP fallback -- the `organizations` table seeding is still flaky
// (Supabase migration not applied yet, or the seed script failing) and
// sign-in shouldn't be blocked on that. If Supabase has no rows (or errors
// entirely) for a given account type, fall back to one hardcoded card so
// there's always something to click and test with. These ids are
// recognized specially by `login` below -- they never touch the
// `organizations` table. Remove once seeding is confirmed reliable.
const FALLBACK_ORG_ID: Record<AccountType, string> = {
  hospital: "__fallback_hospital__",
  insurer: "__fallback_insurer__",
};

function fallbackOrg(accountType: AccountType): OrganizationOption {
  return {
    id: FALLBACK_ORG_ID[accountType],
    name: accountType === "hospital" ? "Demo Hospital (fallback)" : "Demo Insurer (fallback)",
    logoUrl: null,
  };
}

// Public, pre-login: the institution cards shown on /auth/hospital and
// /auth/insurer. All institutions of a given type share the same
// underlying data (claims, catalog, ...) -- this is purely which card the
// person picks for branding/narrative, not a real access boundary.
export const fetchOrganizationsForLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { accountType: AccountType }) => data)
  .handler(async ({ data }): Promise<OrganizationOption[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("organizations")
        .select("id, name, logo_url")
        .eq("type", data.accountType)
        .order("name", { ascending: true });
      if (error) throw error;
      if (rows && rows.length > 0) {
        return rows.map((r) => ({ id: r.id, name: r.name, logoUrl: r.logo_url }));
      }
    } catch (err) {
      console.warn(
        `[auth] fetchOrganizationsForLogin: falling back to hardcoded institution -- ${err instanceof Error ? err.message : err}`,
      );
    }
    return [fallbackOrg(data.accountType)];
  });

const LoginInput = z.object({
  accountType: z.enum(["hospital", "insurer"]),
  organizationId: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((data) => LoginInput.parse(data))
  .handler(async ({ data }): Promise<AppSession> => {
    let org: { id: string; name: string; logo_url: string | null } | null = null;

    if (data.organizationId === FALLBACK_ORG_ID[data.accountType]) {
      const fb = fallbackOrg(data.accountType);
      org = { id: fb.id, name: fb.name, logo_url: fb.logoUrl };
    } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("organizations")
        .select("id, name, logo_url, type")
        .eq("id", data.organizationId)
        .eq("type", data.accountType)
        .maybeSingle();
      if (error) throw error;
      org = row;
    }
    if (!org) throw new Error("That institution could not be found. Please pick one again.");

    const valid = await verifyOpenimisCredentials(data.username, data.password);
    if (!valid) throw new Error("Incorrect openIMIS username or password.");

    const appSession: AppSession = {
      accountType: data.accountType,
      organizationId: org.id,
      organizationName: org.name,
      logoUrl: org.logo_url,
      openimisUsername: data.username,
    };
    const session = await getAppSession();
    await session.update(appSession);
    return appSession;
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAppSession();
  await session.clear();
});

// Used by route guards (client-side beforeLoad calling a server fn, since
// the session cookie is httpOnly and can't be read directly from the
// browser) and by the dashboard header for branding/display.
export const getCurrentSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppSession | null> => {
    const session = await getAppSession();
    const data = session.data as Partial<AppSession> | undefined;
    if (!data?.openimisUsername || !data.organizationId) return null;
    return data as AppSession;
  },
);
