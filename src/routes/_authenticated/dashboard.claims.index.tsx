import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchClaims,
  facilitiesList,
  fmtKES,
  type RiskLevel,
} from "@/lib/claims-api";

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

function ClaimsQueue() {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["claims"],
    queryFn: fetchClaims,
  });

  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<"All" | RiskLevel>("All");
  const [facility, setFacility] = useState<string>("All");
  const [sortKey, setSortKey] = useState<"score" | "amount" | "date">("score");

  const rows = useMemo(() => {
    let r = claims.slice();
    if (q) {
      const s = q.toLowerCase();
      r = r.filter(
        (c) =>
          c.id.toLowerCase().includes(s) ||
          c.patient.toLowerCase().includes(s) ||
          c.patientId.toLowerCase().includes(s),
      );
    }
    if (risk !== "All") r = r.filter((c) => c.riskLevel === risk);
    if (facility !== "All") r = r.filter((c) => c.facility === facility);
    r.sort((a, b) =>
      sortKey === "score"
        ? b.riskScore - a.riskScore
        : sortKey === "amount"
          ? b.amount - a.amount
          : +new Date(b.submittedAt) - +new Date(a.submittedAt),
    );
    return r;
  }, [claims, q, risk, facility, sortKey]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">
          Claims <span className="accent-word">Queue</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${rows.length} claims · sorted by ${sortKey === "score" ? "risk score" : sortKey === "amount" ? "amount" : "date"}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[color:var(--brand-cream)] p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search claim ID or patient…"
          className="min-w-[220px] flex-1 rounded-full bg-background px-4 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:ring-2 focus:ring-[color:var(--brand-brown)]/40"
        />
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value as "All" | RiskLevel)}
          className="rounded-full bg-background px-4 py-2 text-sm"
        >
          {["All", "High", "Medium", "Low"].map((r) => (
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
          <option value="score">Risk score</option>
          <option value="amount">Amount</option>
          <option value="date">Submitted date</option>
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
                    {c.id}
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
                  <RiskBadge level={c.riskLevel} score={c.riskScore} />
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
