import { Outlet, createFileRoute, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/icons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  LayoutDashboard,
  ListChecks,
  Building2,
  Settings as SettingsIcon,
  Bell,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "ClaimGuard — Reviewer Dashboard" }] }),
  component: DashboardLayout,
});

const nav: Array<{ to: string; label: string; end?: boolean; Icon: React.ComponentType<{ className?: string }> }> = [
  { to: "/dashboard", label: "Overview", end: true, Icon: LayoutDashboard },
  { to: "/dashboard/claims", label: "Claims Queue", Icon: ListChecks },
  { to: "/dashboard/hospitals", label: "Hospitals", Icon: Building2 },
  { to: "/dashboard/settings", label: "Settings", Icon: SettingsIcon },
];

function initialsOf(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "U";
  const parts = src.split(/\s+|\./).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src[0].toUpperCase();
}

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ name: string | null; email: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || null;
      setUser({ name, email: u.email ?? null });
    });
  }, []);

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName = user?.name || user?.email || "Reviewer";
  const initials = initialsOf(user?.name, user?.email);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] md:flex">
        <Link to="/" className="flex items-center px-6 py-6 text-white">
          <LogoMark className="h-8 w-auto text-white" />
        </Link>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {nav.map(({ to, label, end, Icon }) => (
            <Link
              key={to}
              to={to}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors " +
                (isActive(to, end)
                  ? "bg-[color:var(--brand-orange)] text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white")
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-6 py-6 text-xs text-white/40">Reviewer console</div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 md:px-10">
          <div className="text-sm text-muted-foreground">
            Scheme · <span className="text-foreground">National Health Insurance</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-cream)] text-foreground hover:bg-accent md:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden flex-col items-end text-right md:flex">
              <span className="text-xs font-medium text-foreground">{displayName}</span>
              <span className="text-[10px] text-muted-foreground">{user?.email ?? "—"}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-brown)] text-sm font-medium text-[color:var(--brand-brown-foreground)]">
              {initials}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>
        <div className="px-6 py-8 md:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
