import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchClaims, fmtKES, type RiskLevel } from "@/lib/claims-api";
import { ShieldAlert, TrendingUp, Wallet, Activity, ArrowUpRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

function Kpi({
  label,
  value,
  tone = "cream",
  Icon,
}: {
  label: string;
  value: string;
  tone?: "cream" | "sage" | "ink" | "brown";
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const cls =
    tone === "sage"
      ? "bg-[color:var(--brand-sage)] text-[color:var(--brand-sage-foreground)]"
      : tone === "ink"
        ? "bg-[color:var(--brand-ink)] text-[color:var(--brand-ink-foreground)]"
        : tone === "brown"
          ? "bg-[color:var(--brand-brown)] text-[color:var(--brand-brown-foreground)]"
          : "bg-[color:var(--brand-cream)] text-foreground";
  return (
    <div className={"rounded-3xl p-7 " + cls}>
      <Icon className="h-5 w-5 opacity-70" />
      <div className="mt-3 font-serif text-4xl leading-none">{value}</div>
      <div className="mt-3 text-sm opacity-80">{label}</div>
    </div>
  );
}

function Donut({ high, med, low }: { high: number; med: number; low: number }) {
  const total = Math.max(high + med + low, 1);
  const c = 2 * Math.PI * 60;
  let offset = 0;
  const seg = (pct: number, color: string) => {
    const len = (pct / 100) * c;
    const el = (
      <circle
        key={color}
        cx="80"
        cy="80"
        r="60"
        fill="none"
        stroke={color}
        strokeWidth="22"
        strokeDasharray={`${len} ${c}`}
        strokeDashoffset={-offset}
        transform="rotate(-90 80 80)"
      />
    );
    offset += len;
    return el;
  };
  return (
    <div className="flex items-center gap-8 rounded-3xl bg-[color:var(--brand-cream)] p-7">
      <svg viewBox="0 0 160 160" className="h-44 w-44">
        {seg((high / total) * 100, "var(--risk-high)")}
        {seg((med / total) * 100, "var(--risk-med)")}
        {seg((low / total) * 100, "var(--risk-low)")}
        <text x="80" y="76" textAnchor="middle" className="font-serif" fontSize="28" fill="currentColor">
          {high + med + low}
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
          claims scored
        </text>
      </svg>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-[color:var(--risk-high)]" />
          <span className="w-20">High risk</span>
          <span className="font-medium text-foreground">{high}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-[color:var(--risk-med)]" />
          <span className="w-20">Medium risk</span>
          <span className="font-medium text-foreground">{med}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-[color:var(--risk-low)]" />
          <span className="w-20">Low risk</span>
          <span className="font-medium text-foreground">{low}</span>
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const fetchClaimsFn = useServerFn(fetchClaims);
  const { data: claims = [], isLoading, isError, error } = useQuery({
    queryKey: ["claims"],
    queryFn: () => fetchClaimsFn(),
  });

  const scored = claims.filter((c) => c.analysis);
  const pending = claims.filter((c) => !c.analysis);
  const high = scored.filter((c) => (c.analysis?.risk_level as RiskLevel) === "High").length;
  const med = scored.filter((c) => (c.analysis?.risk_level as RiskLevel) === "Medium").length;
  const low = scored.filter((c) => (c.analysis?.risk_level as RiskLevel) === "Low").length;
  const totalValueAtRisk = scored
    .filter((c) => c.analysis?.risk_level !== "Low")
    .reduce((s, c) => s + c.amount, 0);
  const avgRiskScore = scored.length
    ? Math.round(scored.reduce((s, c) => s + (c.analysis?.risk_score ?? 0), 0) / scored.length)
    : 0;
  const recent = scored
    .filter((c) => c.analysis?.risk_level === "High")
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl">
          Good morning, <span className="accent-word">Reviewer</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isLoading
            ? "Loading claims…"
            : `${high} high-risk claims need your attention today.${pending.length ? ` ${pending.length} awaiting analysis.` : ""}`}
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl bg-[color:var(--risk-high)]/10 p-4 text-sm text-[color:var(--risk-high)]">
          Failed to load claims from openIMIS: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Claims in queue" value={claims.length.toString()} tone="cream" Icon={Activity} />
        <Kpi label="High-risk flagged" value={high.toString()} tone="ink" Icon={ShieldAlert} />
        <Kpi label="Estimated value at risk" value={fmtKES(totalValueAtRisk)} tone="sage" Icon={Wallet} />
        <Kpi label="Average risk score" value={`${avgRiskScore}/100`} tone="brown" Icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Donut high={high} med={med} low={low} />
        <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recent high-risk claims</h2>
            <Link
              to="/dashboard/claims"
              className="inline-flex items-center gap-1 text-sm text-[color:var(--brand-brown)] hover:underline"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {recent.map((c) => (
              <li key={c.id}>
                <Link
                  to="/dashboard/claims/$claimId"
                  params={{ claimId: c.id }}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-background/40"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {c.patient} · {c.code}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.facility} — {c.diagnosis}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-foreground">{fmtKES(c.amount)}</span>
                    <span className="rounded-full bg-[color:var(--risk-high)] px-3 py-1 text-xs font-medium text-white">
                      {c.analysis?.risk_score}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            {recent.length === 0 && !isLoading && (
              <li className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for analyses…
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
