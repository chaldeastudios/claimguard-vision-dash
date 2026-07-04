import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAppSession, type AccountType, type AppSession } from "./auth-session.server";
import { verifyOpenimisCredentials } from "./openimis-client.server";

export interface OrganizationOption {
  id: string;
  name: string;
  logoUrl: string | null;
}

// Public, pre-login: the institution cards shown on /auth/hospital and
// /auth/insurer. All institutions of a given type share the same
// underlying data (claims, catalog, ...) -- this is purely which card the
// person picks for branding/narrative, not a real access boundary.
export const fetchOrganizationsForLogin = createServerFn({ method: "GET" })
  .inputValidator((data: { accountType: AccountType }) => data)
  .handler(async ({ data }): Promise<OrganizationOption[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("organizations")
      .select("id, name, logo_url")
      .eq("type", data.accountType)
      .order("name", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map((r) => ({ id: r.id, name: r.name, logoUrl: r.logo_url }));
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("id, name, logo_url, type")
      .eq("id", data.organizationId)
      .eq("type", data.accountType)
      .maybeSingle();
    if (error) throw error;
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
