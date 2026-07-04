import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/auth/insurer" });
    if (session.accountType === "hospital") throw redirect({ to: "/hospital-portal" });

    return { session };
  },
  component: () => <Outlet />,
});
