import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InstitutionLogo } from "@/components/brand/institution-logo";
import { toast } from "sonner";
import {
  institutions,
  getInstitution,
  getStoredInstitutionId,
  setInstitution,
} from "@/lib/institutions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ClaimGuard" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [institutionId, setInstitutionId] = useState(institutions[0].id);

  useEffect(() => {
    setInstitutionId(getStoredInstitutionId());
  }, []);

  function handleInstitutionChange(id: string) {
    setInstitutionId(id);
    setInstitution(id);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[color:var(--brand-cream)]">
      <div className="hidden flex-1 flex-col justify-between bg-[color:var(--sidebar)] p-12 text-white lg:flex">
        <Link to="/">
          <InstitutionLogo institution={getInstitution(institutionId)} className="h-10 w-10" />
        </Link>
        <div className="max-w-md space-y-6">
          <h1 className="font-serif text-4xl leading-tight">
            Fraud review built for national health schemes.
          </h1>
          <p className="text-white/70">
            Sign in to review flagged claims, audit hospitals, and protect public funds.
          </p>
        </div>
        <p className="text-xs text-white/40">© ClaimGuard · Demo environment</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-sm">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Institution
          </label>
          <select
            value={institutionId}
            onChange={(e) => handleInstitutionChange(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>

          <h2 className="mt-6 font-serif text-2xl text-foreground">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Access the ClaimGuard reviewer console."
              : "Set up access for your scheme team."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Full name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Work email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to ClaimGuard? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-[color:var(--brand-orange)] hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
