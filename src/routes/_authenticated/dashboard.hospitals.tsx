import { createFileRoute } from "@tanstack/react-router";
import { claims, facilitiesList, fmtKES } from "@/lib/claims-data";

export const Route = createFileRoute("/dashboard/hospitals")({
  component: Hospitals,
});

function Hospitals() {
  const rows = facilitiesList
    .map((f) => {
      const fc = claims.filter((c) => c.facility === f);
      const high = fc.filter((c) => c.riskLevel === "High").length;
      const value = fc.reduce((s, c) => s + c.amount, 0);
      return { f, count: fc.length, high, value };
    })
    .sort((a, b) => b.high - a.high);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">
          Connected <span className="accent-word">Hospitals</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {facilitiesList.length} facilities submitting claims into the scheme.
        </p>
      </div>
      <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Facility</th>
              <th className="px-5 py-4 text-right">Claims</th>
              <th className="px-5 py-4 text-right">High-risk</th>
              <th className="px-5 py-4 text-right">Total value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.f} className="border-t border-border/40 bg-background/40">
                <td className="px-5 py-3 text-foreground">{r.f}</td>
                <td className="px-5 py-3 text-right text-foreground">{r.count}</td>
                <td className="px-5 py-3 text-right">
                  <span className="rounded-full bg-[color:var(--risk-high)]/15 px-2 py-0.5 text-[color:var(--risk-high)]">
                    {r.high}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-foreground">{fmtKES(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
