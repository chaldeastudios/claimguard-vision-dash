import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchClaims, fmtKES } from "@/lib/claims-api";

export const Route = createFileRoute("/_authenticated/dashboard/hospitals")({
  component: Hospitals,
});

interface FacilityRow {
  facility: string;
  count: number;
  high: number;
  medium: number;
  low: number;
  pending: number;
  value: number;
}

function Hospitals() {
  const fetchClaimsFn = useServerFn(fetchClaims);
  const {
    data: claims = [],
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["claims"], queryFn: () => fetchClaimsFn() });

  const rows = useMemo(() => {
    const byFacility = new Map<string, FacilityRow>();
    for (const c of claims) {
      const row = byFacility.get(c.facility) ?? {
        facility: c.facility,
        count: 0,
        high: 0,
        medium: 0,
        low: 0,
        pending: 0,
        value: 0,
      };
      row.count += 1;
      row.value += c.amount;
      if (!c.analysis) row.pending += 1;
      else if (c.analysis.risk_level === "High") row.high += 1;
      else if (c.analysis.risk_level === "Medium") row.medium += 1;
      else if (c.analysis.risk_level === "Low") row.low += 1;
      byFacility.set(c.facility, row);
    }
    return Array.from(byFacility.values()).sort((a, b) => b.high - a.high || b.count - a.count);
  }, [claims]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">
          Connected <span className="accent-word">Hospitals</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isLoading
            ? "Loading facilities from openIMIS…"
            : `${rows.length} facilities submitting claims into the scheme, derived live from openIMIS claims data.`}
        </p>
      </div>

      {isError && (
        <div className="rounded-3xl bg-[color:var(--risk-high)]/10 p-6 text-sm text-[color:var(--risk-high)]">
          Failed to load claims from openIMIS:{" "}
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Facility</th>
              <th className="px-5 py-4 text-right">Claims</th>
              <th className="px-5 py-4 text-right">High-risk</th>
              <th className="px-5 py-4 text-right">Medium-risk</th>
              <th className="px-5 py-4 text-right">Not yet analyzed</th>
              <th className="px-5 py-4 text-right">Total value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.facility} className="border-t border-border/40 bg-background/40">
                <td className="px-5 py-3 text-foreground">{r.facility}</td>
                <td className="px-5 py-3 text-right text-foreground">{r.count}</td>
                <td className="px-5 py-3 text-right">
                  <span className="rounded-full bg-[color:var(--risk-high)]/15 px-2 py-0.5 text-[color:var(--risk-high)]">
                    {r.high}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="rounded-full bg-[color:var(--risk-med)]/15 px-2 py-0.5 text-[color:var(--risk-med)]">
                    {r.medium}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground">{r.pending}</td>
                <td className="px-5 py-3 text-right text-foreground">{fmtKES(r.value)}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No claims recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
