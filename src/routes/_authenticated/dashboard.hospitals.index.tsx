import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchClaims, fmtKES } from "@/lib/claims-api";
import { fetchHealthFacilities } from "@/lib/healthfacility-api";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/hospitals/")({
  head: () => ({ meta: [{ title: "Hospitals — ClaimGuard" }] }),
  component: Hospitals,
});

interface FacilityStats {
  count: number;
  high: number;
  medium: number;
  value: number;
}

function Hospitals() {
  const fetchClaimsFn = useServerFn(fetchClaims);
  const fetchHealthFacilitiesFn = useServerFn(fetchHealthFacilities);

  const {
    data: facilities = [],
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["health-facilities"], queryFn: () => fetchHealthFacilitiesFn() });

  const { data: claims = [] } = useQuery({
    queryKey: ["claims"],
    queryFn: () => fetchClaimsFn(),
  });

  const [q, setQ] = useState("");

  // Claims only carry the facility name (not a facility uuid), so this is
  // a best-effort join by name rather than a real foreign key match.
  const statsByName = useMemo(() => {
    const map = new Map<string, FacilityStats>();
    for (const c of claims) {
      const s = map.get(c.facility) ?? { count: 0, high: 0, medium: 0, value: 0 };
      s.count += 1;
      s.value += c.amount;
      if (c.analysis?.risk_level === "High") s.high += 1;
      else if (c.analysis?.risk_level === "Medium") s.medium += 1;
      map.set(c.facility, s);
    }
    return map;
  }, [claims]);

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return facilities
      .filter(
        (f) =>
          !s ||
          f.name.toLowerCase().includes(s) ||
          f.code.toLowerCase().includes(s) ||
          (f.location ?? "").toLowerCase().includes(s),
      )
      .map((f) => ({ facility: f, stats: statsByName.get(f.name) }))
      .sort((a, b) => (b.stats?.high ?? 0) - (a.stats?.high ?? 0));
  }, [facilities, statsByName, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">
          Connected <span className="accent-word">Hospitals</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isLoading
            ? "Loading facilities from openIMIS…"
            : `${facilities.length} facilities registered in openIMIS.`}
        </p>
      </div>

      {isError && (
        <div className="rounded-3xl bg-[color:var(--risk-high)]/10 p-6 text-sm text-[color:var(--risk-high)]">
          Failed to load facilities from openIMIS:{" "}
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, code, or location…"
          className="w-full rounded-full bg-[color:var(--brand-cream)] py-2 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[color:var(--brand-brown)]/40"
        />
      </div>

      <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Facility</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Level</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4 text-right">Claims</th>
              <th className="px-5 py-4 text-right">High-risk</th>
              <th className="px-5 py-4 text-right">Total value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ facility: f, stats }) => (
              <tr key={f.id} className="border-t border-border/40 bg-background/40">
                <td className="px-5 py-3">
                  <Link
                    to="/dashboard/hospitals/$facilityId"
                    params={{ facilityId: f.id }}
                    className="font-medium text-[color:var(--brand-brown)] hover:underline"
                  >
                    {f.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{f.code}</td>
                <td className="px-5 py-3 text-muted-foreground">{f.levelLabel}</td>
                <td className="px-5 py-3 text-muted-foreground">{f.location ?? "—"}</td>
                <td className="px-5 py-3 text-right text-foreground">{stats?.count ?? 0}</td>
                <td className="px-5 py-3 text-right">
                  <span className="rounded-full bg-[color:var(--risk-high)]/15 px-2 py-0.5 text-[color:var(--risk-high)]">
                    {stats?.high ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-foreground">
                  {fmtKES(stats?.value ?? 0)}
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No facilities match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
