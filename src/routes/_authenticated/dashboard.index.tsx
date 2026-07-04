import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchClaims, fmtKES, type RiskLevel } from "@/lib/claims-api";
import { pendingClaimIds } from "@/lib/pending-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonKpiRow, SkeletonTable } from "@/components/skeletons";
import { ShieldAlert, TrendingUp, Wallet, Activity, Search, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/error-message";

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

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl bg-[color:var(--brand-cream)] p-6">
      <div className="font-serif text-2xl leading-none text-foreground">{value}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
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
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="font-serif"
          fontSize="28"
          fill="currentColor"
        >
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

function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  const bg =
    level === "High"
      ? "bg-[color:var(--risk-high)]"
      : level === "Medium"
        ? "bg-[color:var(--risk-med)]"
        : "bg-[color:var(--risk-low)]";
  return (
    <span
      className={
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white " + bg
      }
    >
      <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px]">{score}</span>
      {level}
    </span>
  );
}

function AnalyzingBadge() {
  return (
    <span className="inline-flex animate-pulse items-center gap-2 rounded-full bg-[color:var(--brand-brown)]/15 px-3 py-1 text-xs font-medium text-[color:var(--brand-brown)]">
      <Loader2 className="h-3 w-3 animate-spin" />
      Analyzing…
    </span>
  );
}

function NoAnalysisBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      No analysis done
    </span>
  );
}

function Overview() {
  const fetchClaimsFn = useServerFn(fetchClaims);
  const {
    data: claims = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["claims"],
    queryFn: () => fetchClaimsFn(),
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;
      return data.some((c) => !c.analysis && pendingClaimIds.has(c.id)) ? 4000 : false;
    },
  });

  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<"All" | RiskLevel | "Pending">("All");
  const [facility, setFacility] = useState<string>("All");
  const [sortKey, setSortKey] = useState<"score" | "amount" | "date">("date");

  const facilitiesList = useMemo(
    () => Array.from(new Set(claims.map((c) => c.facility))).sort(),
    [claims],
  );

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

  // --- Richer analytics, all derived from the claims already loaded ---
  const coveragePct = claims.length ? Math.round((scored.length / claims.length) * 100) : 0;
  const highRiskRate = scored.length ? Math.round((high / scored.length) * 100) : 0;
  const totalClaimedValue = claims.reduce((s, c) => s + c.amount, 0);
  const largestFlagged = scored
    .filter((c) => (c.analysis?.risk_level as RiskLevel) !== "Low")
    .reduce((mx, c) => Math.max(mx, c.amount), 0);

  // Per-facility rollup, ranked by estimated value at risk (High+Medium).
  const facilityStats = useMemo(() => {
    const m = new Map<
      string,
      {
        facility: string;
        count: number;
        high: number;
        med: number;
        low: number;
        valueAtRisk: number;
      }
    >();
    for (const c of claims) {
      const e = m.get(c.facility) ?? {
        facility: c.facility,
        count: 0,
        high: 0,
        med: 0,
        low: 0,
        valueAtRisk: 0,
      };
      e.count += 1;
      const lvl = c.analysis?.risk_level as RiskLevel | undefined;
      if (lvl === "High") e.high += 1;
      else if (lvl === "Medium") e.med += 1;
      else if (lvl === "Low") e.low += 1;
      if (lvl === "High" || lvl === "Medium") e.valueAtRisk += c.amount;
      m.set(c.facility, e);
    }
    return Array.from(m.values()).sort((a, b) => b.valueAtRisk - a.valueAtRisk);
  }, [claims]);
  const topFacilities = facilityStats.slice(0, 5);
  const maxFacilityValue = Math.max(1, ...topFacilities.map((f) => f.valueAtRisk));

  // Top diagnoses among flagged (High/Medium) claims -- what's driving risk.
  const topFlaggedDiagnoses = useMemo(() => {
    const m = new Map<string, { key: string; label: string; count: number }>();
    for (const c of scored) {
      const lvl = c.analysis?.risk_level as RiskLevel | undefined;
      if (lvl !== "High" && lvl !== "Medium") continue;
      const key = c.diagnosisCode || c.diagnosis || "—";
      const label = c.diagnosisCode ? `${c.diagnosisCode} · ${c.diagnosis}` : c.diagnosis || "—";
      const e = m.get(key) ?? { key, label, count: 0 };
      e.count += 1;
      m.set(key, e);
    }
    return Array.from(m.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [scored]);
  const maxDiagCount = Math.max(1, ...topFlaggedDiagnoses.map((d) => d.count));

  const rows = useMemo(() => {
    let r = claims.slice();
    if (q) {
      const s = q.toLowerCase();
      r = r.filter(
        (c) =>
          c.code.toLowerCase().includes(s) ||
          c.patient.toLowerCase().includes(s) ||
          c.patientId.toLowerCase().includes(s),
      );
    }
    if (risk === "Pending") r = r.filter((c) => !c.analysis);
    else if (risk !== "All") r = r.filter((c) => (c.analysis?.risk_level as RiskLevel) === risk);
    if (facility !== "All") r = r.filter((c) => c.facility === facility);
    r.sort((a, b) =>
      sortKey === "score"
        ? (b.analysis?.risk_score ?? -1) - (a.analysis?.risk_score ?? -1)
        : sortKey === "amount"
          ? b.amount - a.amount
          : +new Date(b.submittedAt) - +new Date(a.submittedAt),
    );
    return r;
  }, [claims, q, risk, facility, sortKey]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl">
          Good morning, <span className="accent-word">Reviewer</span>
        </h1>
        {isLoading ? (
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        ) : (
          <p className="mt-2 text-muted-foreground">
            {`${high} high-risk claims need your attention today.${pending.length ? ` ${pending.length} awaiting analysis.` : ""}`}
          </p>
        )}
      </div>

      {isError && (
        <div className="rounded-2xl bg-[color:var(--risk-high)]/10 p-4 text-sm text-[color:var(--risk-high)]">
          Failed to load claims from openIMIS:{" "}
          {getErrorMessage(error)}
        </div>
      )}

      {isLoading ? (
        <>
          <SkeletonKpiRow />
          <Skeleton className="h-56 w-full rounded-3xl" />
          <SkeletonTable rows={8} cols={7} />
        </>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Claims in queue"
              value={claims.length.toString()}
              tone="cream"
              Icon={Activity}
            />
            <Kpi label="High-risk flagged" value={high.toString()} tone="ink" Icon={ShieldAlert} />
            <Kpi
              label="Estimated value at risk"
              value={fmtKES(totalValueAtRisk)}
              tone="sage"
              Icon={Wallet}
            />
            <Kpi
              label="Average risk score"
              value={`${avgRiskScore}/100`}
              tone="brown"
              Icon={TrendingUp}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <Donut high={high} med={med} low={low} />

            {/* Secondary stat tiles -- coverage, flag rate, exposure */}
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-2">
              <MiniStat
                label="Analysis coverage"
                value={`${coveragePct}%`}
                sub={`${scored.length} of ${claims.length} scored`}
              />
              <MiniStat
                label="High-risk rate"
                value={`${highRiskRate}%`}
                sub={`${high} of ${scored.length} scored claims`}
              />
              <MiniStat
                label="Largest flagged claim"
                value={largestFlagged ? fmtKES(largestFlagged) : "—"}
                sub="Single highest High/Medium claim"
              />
              <MiniStat
                label="Total claimed (queue)"
                value={fmtKES(totalClaimedValue)}
                sub={`${claims.length} claims in queue`}
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Facility leaderboard by value at risk */}
            <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
              <h3 className="font-serif text-lg">
                Facilities by <span className="accent-word">value at risk</span>
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimated High + Medium exposure per facility
              </p>
              <div className="mt-5 space-y-4">
                {topFacilities.map((f) => (
                  <div key={f.facility}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate pr-3 text-foreground">{f.facility}</span>
                      <span className="shrink-0 font-medium text-foreground">
                        {fmtKES(f.valueAtRisk)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-background/70">
                      <div
                        className="h-full rounded-full bg-[color:var(--brand-brown)]"
                        style={{ width: `${(f.valueAtRisk / maxFacilityValue) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                      <span>{f.count} claims</span>
                      <span className="text-[color:var(--risk-high)]">{f.high} high</span>
                      <span className="text-[color:var(--risk-med)]">{f.med} med</span>
                    </div>
                  </div>
                ))}
                {topFacilities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No facility data yet.</p>
                )}
              </div>
            </div>

            {/* Top diagnoses driving flags */}
            <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
              <h3 className="font-serif text-lg">
                Diagnoses driving <span className="accent-word">flags</span>
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Most common diagnoses among High/Medium-risk claims
              </p>
              <div className="mt-5 space-y-4">
                {topFlaggedDiagnoses.map((d) => (
                  <div key={d.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate pr-3 text-foreground">{d.label}</span>
                      <span className="shrink-0 font-medium text-foreground">{d.count}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-background/70">
                      <div
                        className="h-full rounded-full bg-[color:var(--brand-sage)]"
                        style={{ width: `${(d.count / maxDiagCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {topFlaggedDiagnoses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No flagged claims yet — run AI analysis to populate this.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-2xl">
                Claims <span className="accent-word">Queue</span>
              </h2>
              <p className="text-sm text-muted-foreground">{`${rows.length} claims`}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[color:var(--brand-cream)] p-4">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search claim ID or patient…"
                  className="w-full rounded-full bg-background py-2 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[color:var(--brand-brown)]/40"
                />
              </div>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value as typeof risk)}
                className="rounded-full bg-background px-4 py-2 text-sm"
              >
                {["All", "High", "Medium", "Low", "Pending"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <select
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                className="max-w-[260px] rounded-full bg-background px-4 py-2 text-sm"
              >
                <option>All</option>
                {facilitiesList.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as "score" | "amount" | "date")}
                className="rounded-full bg-background px-4 py-2 text-sm"
              >
                <option value="date">Submitted date</option>
                <option value="score">Risk score</option>
                <option value="amount">Amount</option>
              </select>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4">Claim</th>
                    <th className="px-5 py-4">Patient</th>
                    <th className="px-5 py-4">Facility</th>
                    <th className="px-5 py-4">Diagnosis</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                    <th className="px-5 py-4">Submitted</th>
                    <th className="px-5 py-4 text-right">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-border/40 bg-background/40 hover:bg-background/80"
                    >
                      <td className="px-5 py-3">
                        <Link
                          to="/dashboard/claims/$claimId"
                          params={{ claimId: c.id }}
                          className="font-medium text-[color:var(--brand-brown)] hover:underline"
                        >
                          {c.code}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-foreground">{c.patient}</div>
                        <div className="text-xs text-muted-foreground">{c.patientId}</div>
                      </td>
                      <td className="px-5 py-3 text-foreground">{c.facility}</td>
                      <td className="px-5 py-3">
                        <div className="text-foreground">{c.diagnosisCode}</div>
                        <div className="text-xs text-muted-foreground">{c.diagnosis}</div>
                      </td>
                      <td className="px-5 py-3 text-right text-foreground">{fmtKES(c.amount)}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(c.submittedAt).toLocaleDateString("en-KE", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {c.analysis ? (
                          <RiskBadge
                            level={c.analysis.risk_level as RiskLevel}
                            score={c.analysis.risk_score}
                          />
                        ) : pendingClaimIds.has(c.id) ? (
                          <AnalyzingBadge />
                        ) : (
                          <NoAnalysisBadge />
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        No claims match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
