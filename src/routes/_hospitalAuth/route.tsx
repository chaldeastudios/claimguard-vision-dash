import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/_hospitalAuth")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/auth/hospital" });
    if (session.accountType === "insurer") throw redirect({ to: "/dashboard" });

    return { session };
  },
  component: () => <Outlet />,
});
