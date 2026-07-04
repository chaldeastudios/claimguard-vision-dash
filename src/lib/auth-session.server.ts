// ClaimGuard's own session, replacing Supabase Auth. There is no per-person
// account anymore -- signing in means picking one of the branded
// institution cards (a row in the `organizations` table) and then proving
// you belong to it with real openIMIS credentials (verified live against
// openIMIS's own tokenAuth mutation, see openimis-client.server.ts). The
// institution choice is cosmetic/narrative for the demo -- every insurer
// account sees every claim regardless of which card was used, and every
// hospital account submits against the same openIMIS catalog -- so the
// session only needs to remember which card was picked for branding
// (name/logo) plus which openIMIS username is "logged in".
import { useSession } from "@tanstack/react-start/server";

export type AccountType = "hospital" | "insurer";

export interface AppSession {
  accountType: AccountType;
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  openimisUsername: string;
}

// iron-webcrypto (which TanStack Start's session helpers use under the
// hood) requires a password of at least 32 characters. This demo doesn't
// need a real secret rotated per deployment -- set SESSION_SECRET yourself
// if you want one, otherwise this fixed dev value is fine.
const SESSION_SECRET =
  process.env.SESSION_SECRET || "claimguard-demo-session-secret-please-change-32+chars";

const sessionConfig = {
  password: SESSION_SECRET,
  name: "claimguard_session",
  maxAge: 60 * 60 * 24, // 1 day
};

export async function getAppSession() {
  // Not a React hook -- this is TanStack Start's server-side session
  // manager, just named with a `use` prefix that trips the react-hooks lint
  // rule.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSession<AppSession>(sessionConfig);
}
