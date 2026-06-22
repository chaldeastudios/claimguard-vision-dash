import { createFileRoute, Link } from "@tanstack/react-router";
import {
  claims,
  fmtKES,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  totalValueAtRisk,
  avgRiskScore,
} from "@/lib/claims-data";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Kpi({
  label,
  value,
  tone = "cream",
}: {
  label: string;
  value: string;
  tone?: "cream" | "sage" | "ink" | "brown";
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
      <div className="font-serif text-4xl leading-none">{value}</div>
      <div className="mt-3 text-sm opacity-80">{label}</div>
    </div>
  );
}

function Donut() {
  const total = highRiskCount + mediumRiskCount + lowRiskCount;
  const high = (highRiskCount / total) * 100;
  const med = (mediumRiskCount / total) * 100;
  const low = (lowRiskCount / total) * 100;
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
        {seg(high, "var(--risk-high)")}
        {seg(med, "var(--risk-med)")}
        {seg(low, "var(--risk-low)")}
        <text x="80" y="76" textAnchor="middle" className="font-serif" fontSize="28" fill="currentColor">
          {total}
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
          claims scored
        </text>
      </svg>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-[color:var(--risk-high)]" />
          <span className="w-20">High risk</span>
          <span className="font-medium text-foreground">{highRiskCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-[color:var(--risk-med)]" />
          <span className="w-20">Medium risk</span>
          <span className="font-medium text-foreground">{mediumRiskCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-[color:var(--risk-low)]" />
          <span className="w-20">Low risk</span>
          <span className="font-medium text-foreground">{lowRiskCount}</span>
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const recent = claims.filter((c) => c.riskLevel === "High").slice(0, 6);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl">
          Good morning, <span className="accent-word">Reviewer</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {highRiskCount} high-risk claims need your attention today.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Claims scored today" value={claims.length.toString()} tone="cream" />
        <Kpi label="High-risk flagged" value={highRiskCount.toString()} tone="ink" />
        <Kpi label="Estimated value at risk" value={fmtKES(totalValueAtRisk)} tone="sage" />
        <Kpi label="Average risk score" value={`${avgRiskScore}/100`} tone="brown" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Donut />
        <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recent high-risk claims</h2>
            <Link
              to="/dashboard/claims"
              className="text-sm text-[color:var(--brand-brown)] hover:underline"
            >
              View all →
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
                      {c.patient} · {c.id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.facility} — {c.diagnosis}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-foreground">{fmtKES(c.amount)}</span>
                    <span className="rounded-full bg-[color:var(--risk-high)] px-3 py-1 text-xs font-medium text-white">
                      {c.riskScore}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
