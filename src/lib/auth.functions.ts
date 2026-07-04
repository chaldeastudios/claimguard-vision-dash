import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAppSession, type AccountType, type AppSession } from "./auth-session.server";
import { verifyOpenimisCredentials } from "./openimis-client.server";
import { HOSPITALS, INSURERS } from "./institutions";

function institutionsFor(accountType: AccountType) {
  return accountType === "hospital" ? HOSPITALS : INSURERS;
}

const LoginInput = z.object({
  accountType: z.enum(["hospital", "insurer"]),
  organizationId: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

// Signing in means picking one of the hardcoded institutions (see
// institutions.ts) and proving you belong to it with real openIMIS
// credentials, verified live against openIMIS's own tokenAuth mutation.
// The institution choice is cosmetic/narrative for the demo -- every
// account of a given type sees the same underlying data regardless of
// which one is chosen.
export const login = createServerFn({ method: "POST" })
  .inputValidator((data) => LoginInput.parse(data))
  .handler(async ({ data }): Promise<AppSession> => {
    const org = institutionsFor(data.accountType).find((i) => i.id === data.organizationId);
    if (!org) throw new Error("That institution could not be found. Please pick one again.");

    const valid = await verifyOpenimisCredentials(data.username, data.password);
    if (!valid) throw new Error("Incorrect openIMIS username or password.");

    const appSession: AppSession = {
      accountType: data.accountType,
      organizationId: org.id,
      organizationName: org.name,
      logoUrl: org.logoUrl,
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
