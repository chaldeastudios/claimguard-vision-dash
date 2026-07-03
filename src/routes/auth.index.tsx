import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/icons";

export const Route = createFileRoute("/auth/")({
  head: () => ({ meta: [{ title: "Sign in — ClaimGuard" }] }),
  component: AuthChooser,
});

function AuthChooser() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--brand-cream)] px-6 py-16">
      <Link to="/" className="mb-10">
        <LogoMark className="h-10 w-auto text-[color:var(--brand-brown)]" />
      </Link>
      <div className="text-center">
        <h1 className="font-serif text-4xl">
          Sign in to <span className="accent-word">ClaimGuard</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Which kind of account are you signing in to?</p>
      </div>

      <div className="mt-10 grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <Link
          to="/auth/hospital"
          className="group rounded-3xl bg-background p-8 text-left transition-transform hover:-translate-y-0.5"
        >
          <Building2 className="h-8 w-8 text-[color:var(--brand-brown)]" />
          <h2 className="mt-4 font-serif text-2xl">
            Healthcare <span className="accent-word">facility</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For hospital and clinic staff submitting claims to an insurer for review.
          </p>
        </Link>

        <Link
          to="/auth/insurer"
          className="group rounded-3xl bg-background p-8 text-left transition-transform hover:-translate-y-0.5"
        >
          <ShieldCheck className="h-8 w-8 text-[color:var(--brand-brown)]" />
          <h2 className="mt-4 font-serif text-2xl">
            Insurance <span className="accent-word">institution</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For scheme reviewers auditing incoming claims for fraud risk.
          </p>
        </Link>
      </div>
    </div>
  );
}
