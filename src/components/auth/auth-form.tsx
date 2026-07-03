import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/brand/icons";
import { toast } from "sonner";

interface AuthFormProps {
  accountType: "hospital" | "insurer";
  redirectTo: string;
  heroTitle: string;
  heroSubtitle: string;
  formSubtitleSignIn: string;
  formSubtitleSignUp: string;
}

// Shared sign-in/sign-up form for both account-type login paths
// (/auth/hospital, /auth/insurer). Only the copy and the destination differ
// -- both reuse the same Supabase auth backend, tagging the profile with
// which kind of account this is so the route guards and claim routing know
// how to treat it.
export function AuthForm({
  accountType,
  redirectTo,
  heroTitle,
  heroSubtitle,
  formSubtitleSignIn,
  formSubtitleSignUp,
}: AuthFormProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirectTo });
    });
  }, [navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + redirectTo,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              { id: data.user.id, full_name: name, email, account_type: accountType },
              { onConflict: "id" },
            );
          if (profileError) throw profileError;
        }
        toast.success("Account created. You're signed in.");
        navigate({ to: redirectTo });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirectTo });
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
          <h2 className="mt-3 font-serif text-2xl text-foreground">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? formSubtitleSignIn : formSubtitleSignUp}
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
            {mode === "signin" ? "New here? " : "Already have an account? "}
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
