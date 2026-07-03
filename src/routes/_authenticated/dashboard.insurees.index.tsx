import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchInsurees } from "@/lib/families-api";
import { InsureeCreateDialog } from "@/components/insuree-create-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/skeletons";
import { Search, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/insurees/")({
  head: () => ({ meta: [{ title: "Insurees — ClaimGuard" }] }),
  component: InsureesList,
});

function InsureesList() {
  const qc = useQueryClient();
  const fetchInsureesFn = useServerFn(fetchInsurees);
  const {
    data: insurees = [],
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["insurees"], queryFn: () => fetchInsureesFn() });

  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!q) return insurees;
    const s = q.toLowerCase();
    return insurees.filter(
      (i) => i.name.toLowerCase().includes(s) || i.chfId.toLowerCase().includes(s),
    );
  }, [insurees, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">
            <span className="accent-word">Insurees</span>
          </h1>
          {isLoading ? (
            <Skeleton className="mt-3 h-4 w-24" />
          ) : (
            <p className="mt-2 text-muted-foreground">{`${rows.length} insurees`}</p>
          )}
        </div>
        <InsureeCreateDialog onCreated={() => qc.invalidateQueries({ queryKey: ["insurees"] })} />
      </div>

      {isError && (
        <div className="rounded-2xl bg-[color:var(--risk-high)]/10 p-4 text-sm text-[color:var(--risk-high)]">
          Failed to load insurees from openIMIS:{" "}
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={7} cols={6} />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or CHF ID…"
              className="w-full rounded-full bg-[color:var(--brand-cream)] py-2 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[color:var(--brand-brown)]/40"
            />
          </div>

          <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">CHF ID</th>
                  <th className="px-5 py-4">Date of birth</th>
                  <th className="px-5 py-4">Gender</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Village</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr
                    key={i.id}
                    className="border-t border-border/40 bg-background/40 hover:bg-background/80"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to="/dashboard/insurees/$insureeId"
                        params={{ insureeId: i.id }}
                        className="inline-flex items-center gap-1.5 font-medium text-[color:var(--brand-brown)] hover:underline"
                      >
                        {i.head && (
                          <Crown className="h-3.5 w-3.5 text-[color:var(--brand-orange)]" />
                        )}
                        {i.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-foreground">{i.chfId}</td>
                    <td className="px-5 py-3 text-muted-foreground">{i.dob ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{i.gender ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{i.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{i.village ?? "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      No insurees match the current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
