import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { LogoMark } from "@/components/brand/icons";
import { OrganizationLogo } from "@/components/brand/organization-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOrganizationsForLogin, login, type OrganizationOption } from "@/lib/auth.functions";
import type { AccountType } from "@/lib/auth-session.server";

interface AuthFormProps {
  accountType: AccountType;
  redirectTo: string;
  heroTitle: string;
  heroSubtitle: string;
}

// A deterministic color per institution so cards with no uploaded logo yet
// still read as visually distinct ("six cards, different logos") instead
// of six identical placeholders.
const AVATAR_COLORS = [
  "#8D6959", // brand-brown
  "#A1A16A", // brand-sage
  "#FB6032", // brand-orange
  "#5B7C99",
  "#B0568C",
  "#C97A3D",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name[0]?.toUpperCase() || "?"
  );
}

function InstitutionCard({ org, onSelect }: { org: OrganizationOption; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-[color:var(--brand-brown)] hover:bg-accent"
    >
      {org.logoUrl ? (
        <OrganizationLogo logoUrl={org.logoUrl} className="h-9 w-9 shrink-0" />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: colorFor(org.name) }}
        >
          {initialsOf(org.name)}
        </span>
      )}
      <span className="truncate text-sm font-medium text-foreground">{org.name}</span>
    </button>
  );
}

// Two-step sign-in: pick a branded institution card, then prove you belong
// to it with real openIMIS credentials -- there's no ClaimGuard account
// database of its own anymore (see src/lib/auth-session.server.ts). Which
// card is picked is cosmetic/narrative for the demo: every account of a
// given type sees the same underlying data regardless of which one is
// chosen, it just changes the branding shown afterward.
export function AuthForm({ accountType, redirectTo, heroTitle, heroSubtitle }: AuthFormProps) {
  const navigate = useNavigate();
  const fetchOrgsFn = useServerFn(fetchOrganizationsForLogin);
  const loginFn = useServerFn(login);

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["login-organizations", accountType],
    queryFn: () => fetchOrgsFn({ data: { accountType } }),
  });

  const [selected, setSelected] = useState<OrganizationOption | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    try {
      await loginFn({
        data: { accountType, organizationId: selected.id, username, password },
      });
      navigate({ to: redirectTo });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[color:var(--brand-cream)]">
      <div className="hidden flex-1 flex-col justify-between bg-[color:var(--sidebar)] p-12 text-white lg:flex">
        <Link to="/">
          <LogoMark className="h-9 w-auto text-[color:var(--brand-orange)]" />
        </Link>
        <div className="max-w-md space-y-6">
          <h1 className="font-serif text-4xl leading-tight">{heroTitle}</h1>
          <p className="text-white/70">{heroSubtitle}</p>
        </div>
        <p className="text-xs text-white/40">© ClaimGuard · Demo environment</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-sm">
          <Link
            to="/auth"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Choose a different account type
          </Link>

          {!selected ? (
            <>
              <h2 className="mt-3 font-serif text-2xl text-foreground">Choose your institution</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All institutions share the same demo data — pick the one to sign in as.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {orgsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[60px] rounded-2xl" />
                  ))
                ) : orgs.length === 0 ? (
                  <p className="col-span-2 text-sm text-muted-foreground">
                    No institutions are set up yet.
                  </p>
                ) : (
                  orgs.map((org) => (
                    <InstitutionCard key={org.id} org={org} onSelect={() => setSelected(org)} />
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-3">
                {selected.logoUrl ? (
                  <OrganizationLogo logoUrl={selected.logoUrl} className="h-8 w-8" />
                ) : (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: colorFor(selected.name) }}
                  >
                    {initialsOf(selected.name)}
                  </span>
                )}
                <h2 className="font-serif text-2xl text-foreground">{selected.name}</h2>
                <Check className="h-4 w-4 text-[color:var(--risk-low)]" />
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Not your institution? Choose again
              </button>
              <p className="mt-4 text-sm text-muted-foreground">
                Sign in with your openIMIS username and password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    openIMIS username
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[color:var(--brand-orange)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Please wait…" : "Sign in"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
