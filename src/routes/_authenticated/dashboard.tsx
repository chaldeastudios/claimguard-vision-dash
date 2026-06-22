import { Outlet, createFileRoute, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LogoMark } from "@/components/brand/icons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "ClaimGuard — Reviewer Dashboard" }],
  }),
  component: DashboardLayout,
});

const nav: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/claims", label: "Claims Queue" },
  { to: "/dashboard/hospitals", label: "Hospitals" },
  { to: "/dashboard/settings", label: "Settings" },
];

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] md:flex">
        <Link to="/" className="flex items-center gap-2 px-6 py-6 text-white">
          <LogoMark className="h-8 w-8 text-[color:var(--brand-orange)]" />
          <span className="font-serif text-xl">ClaimGuard</span>
        </Link>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={
                "rounded-xl px-3 py-2.5 text-sm transition-colors " +
                (isActive(n.to, n.end)
                  ? "bg-[color:var(--brand-orange)] text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white")
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {/* suppress unused */}
        <span className="hidden">{pathname}</span>
        <div className="mt-auto px-6 py-6 text-xs text-white/40">
          Reviewer · Demo Mode
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 md:px-10">
          <div className="text-sm text-muted-foreground">
            Scheme · <span className="text-foreground">National Health Insurance</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[color:var(--brand-cream)] px-3 py-1.5 text-xs text-foreground">
              Last sync: just now
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-brown)] text-sm font-medium text-[color:var(--brand-brown-foreground)]">
              AM
            </div>
          </div>
        </header>
        <div className="px-6 py-8 md:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
