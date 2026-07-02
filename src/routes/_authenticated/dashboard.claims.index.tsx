import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchClaims,
  facilitiesList,
  fmtKES,
  type RiskLevel,
} from "@/lib/claims-api";
import { pendingClaimIds } from "@/lib/pending-analysis";
import { Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/claims/")({
  component: ClaimsQueue,
});

function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  const bg =
    level === "High"
      ? "bg-[color:var(--risk-high)]"
      : level === "Medium"
        ? "bg-[color:var(--risk-med)]"
        : "bg-[color:var(--risk-low)]";
  return (
    <span className={"inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white " + bg}>
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

function ClaimsQueue() {
  const fetchClaimsFn = useServerFn(fetchClaims);
  const { data: claims = [], isLoading, isError, error } = useQuery({
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">
            Claims <span className="accent-word">Queue</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isLoading ? "Loading…" : `${rows.length} claims`}
          </p>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl bg-[color:var(--risk-high)]/10 p-4 text-sm text-[color:var(--risk-high)]">
          Failed to load claims from openIMIS: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[color:var(--brand-cream)] p-4">
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

      <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
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
              <tr key={c.id} className="border-t border-border/40 bg-background/40 hover:bg-background/80">
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
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading claims…" : "No claims match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
