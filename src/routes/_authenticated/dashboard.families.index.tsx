import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchFamilies } from "@/lib/families-api";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/families/")({
  head: () => ({ meta: [{ title: "Families — ClaimGuard" }] }),
  component: FamiliesList,
});

function FamiliesList() {
  const fetchFamiliesFn = useServerFn(fetchFamilies);
  const {
    data: families = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["families"],
    queryFn: () => fetchFamiliesFn(),
  });

  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!q) return families;
    const s = q.toLowerCase();
    return families.filter(
      (f) =>
        f.headName.toLowerCase().includes(s) ||
        f.headChfId.toLowerCase().includes(s) ||
        f.location.toLowerCase().includes(s) ||
        f.address.toLowerCase().includes(s),
    );
  }, [families, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">
          Families <span className="accent-word">& Households</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isLoading ? "Loading…" : `${rows.length} families`}
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl bg-[color:var(--risk-high)]/10 p-4 text-sm text-[color:var(--risk-high)]">
          Failed to load families from openIMIS:{" "}
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search head of household, CHF ID, or location…"
          className="w-full rounded-full bg-[color:var(--brand-cream)] py-2 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[color:var(--brand-brown)]/40"
        />
      </div>

      <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Head of household</th>
              <th className="px-5 py-4">CHF ID</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Address</th>
              <th className="px-5 py-4">Poverty status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr
                key={f.id}
                className="border-t border-border/40 bg-background/40 hover:bg-background/80"
              >
                <td className="px-5 py-3">
                  <Link
                    to="/dashboard/families/$familyId"
                    params={{ familyId: f.id }}
                    className="font-medium text-[color:var(--brand-brown)] hover:underline"
                  >
                    {f.headName}
                  </Link>
                </td>
                <td className="px-5 py-3 text-foreground">{f.headChfId}</td>
                <td className="px-5 py-3 text-foreground">{f.location}</td>
                <td className="px-5 py-3 text-muted-foreground">{f.address || "—"}</td>
                <td className="px-5 py-3">
                  {f.poverty ? (
                    <span className="inline-flex items-center rounded-full bg-[color:var(--risk-med)]/15 px-3 py-1 text-xs font-medium text-[color:var(--risk-med)]">
                      Below poverty line
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading families…" : "No families match the current search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
