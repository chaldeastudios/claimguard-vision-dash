import { createMiddleware } from "@tanstack/react-start";
import { getAppSession, type AppSession } from "./auth-session.server";

// Replaces requireSupabaseAuth everywhere a server function just needs "is
// someone signed in" -- see auth-session.server.ts for what signing in
// means now that there's no Supabase Auth. Every existing caller only ever
// used the old middleware as a login gate (none relied on Supabase RLS for
// real row ownership beyond what's since been read straight out of the
// session below), so this is a drop-in swap: same `.middleware([...])`
// call site, `context.session` instead of `context.supabase`/`context.userId`.
export const requireSession = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const session = await getAppSession();
  const data = session.data as Partial<AppSession> | undefined;
  if (!data?.openimisUsername || !data.organizationId) {
    throw new Error("Unauthorized: not signed in");
  }
  return next({ context: { session: data as AppSession } });
});
