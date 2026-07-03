import { Outlet, createFileRoute, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { OrganizationLogo } from "@/components/brand/organization-logo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings as SettingsIcon, Bell } from "lucide-react";
import { CURRENT_PROFILE_QUERY_KEY, fetchCurrentProfile } from "@/lib/current-profile";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "ClaimGuard — Reviewer Dashboard" }] }),
  component: DashboardLayout,
});

const nav: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/dashboard/families", label: "Families" },
  { to: "/dashboard/hospitals", label: "Hospitals" },
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
  const { data: profile } = useQuery({
    queryKey: CURRENT_PROFILE_QUERY_KEY,
    queryFn: fetchCurrentProfile,
  });

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  const isSettingsActive = pathname.startsWith("/dashboard/settings");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName = profile?.name || profile?.email || "Reviewer";
  const initials = initialsOf(profile?.name, profile?.email);

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-4 md:px-10">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center">
            <OrganizationLogo logoUrl={profile?.logoUrl} className="h-9" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label, end }) => (
              <Link
                key={to}
                to={to}
                className={
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors " +
                  (isActive(to, end)
                    ? "bg-[color:var(--brand-brown)] text-[color:var(--brand-brown-foreground)]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground")
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-cream)] text-foreground hover:bg-accent md:inline-flex"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <Link
            to="/dashboard/settings"
            aria-label="Settings"
            className={
              "hidden h-9 w-9 items-center justify-center rounded-full md:inline-flex " +
              (isSettingsActive
                ? "bg-[color:var(--brand-brown)] text-[color:var(--brand-brown-foreground)]"
                : "bg-[color:var(--brand-cream)] text-foreground hover:bg-accent")
            }
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
          <div className="hidden flex-col items-end text-right md:flex">
            <span className="text-xs font-medium text-foreground">{displayName}</span>
            <span className="text-[10px] text-muted-foreground">{profile?.email ?? "—"}</span>
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
    </div>
  );
}
