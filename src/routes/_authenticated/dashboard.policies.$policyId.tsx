import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchPolicy, fetchPremiumsByPolicy } from "@/lib/policy-api";
import { fmtKES } from "@/lib/claims-api";
import { PremiumDialog } from "@/components/premium-dialog";
import { ArrowLeft, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/policies/$policyId")({
  component: PolicyDetail,
  notFoundComponent: () => <div className="p-10 text-muted-foreground">Policy not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">
      Something went wrong loading this policy. {error.message}
    </div>
  ),
});

const STATUS_TONE: Record<string, string> = {
  active: "bg-[color:var(--risk-low)]",
  idle: "bg-[color:var(--brand-brown)]",
  suspended: "bg-[color:var(--risk-med)]",
  expired: "bg-[color:var(--risk-high)]",
};

function PolicyDetail() {
  const { policyId } = Route.useParams();
  const qc = useQueryClient();
  const fetchPolicyFn = useServerFn(fetchPolicy);
  const fetchPremiumsByPolicyFn = useServerFn(fetchPremiumsByPolicy);

  const {
    data: policy,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["policy", policyId],
    queryFn: async () => {
      const p = await fetchPolicyFn({ data: { policyId } });
      if (!p) throw notFound();
      return p;
    },
  });

  const { data: premiums = [], isLoading: premiumsLoading } = useQuery({
    queryKey: ["policy-premiums", policyId],
    queryFn: () => fetchPremiumsByPolicyFn({ data: { policyId } }),
    enabled: !!policy,
  });

  if (isError) {
    return (
      <div className="p-10 text-sm text-[color:var(--risk-high)]">
        Failed to load policy from openIMIS:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (isLoading || !policy) {
    return <div className="p-10 text-muted-foreground">Loading policy…</div>;
  }

  const totalPaid = premiums.reduce((s, p) => s + p.amount, 0);
  const tone = STATUS_TONE[policy.status] ?? "bg-[color:var(--brand-brown)]";

  return (
    <div className="space-y-8">
      <div>
        {policy.familyId ? (
          <Link
            to="/dashboard/families/$familyId"
            params={{ familyId: policy.familyId }}
            className="inline-flex items-center gap-1 text-sm text-[color:var(--brand-brown)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to household
          </Link>
        ) : (
          <Link
            to="/dashboard/families"
            className="inline-flex items-center gap-1 text-sm text-[color:var(--brand-brown)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to families
          </Link>
        )}
        <h1 className="mt-2 font-serif text-4xl">
          <span className="accent-word">{policy.productCode}</span> — {policy.productName}
        </h1>
        {policy.familyHeadName && (
          <p className="mt-2 text-muted-foreground">{policy.familyHeadName}'s household</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 font-serif text-xl">
                <Wallet className="h-4 w-4 text-[color:var(--brand-orange)]" />
                Contribution history
              </h2>
              <PremiumDialog
                policyUuid={policy.id}
                onSaved={() => qc.invalidateQueries({ queryKey: ["policy-premiums", policyId] })}
              />
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl bg-background/60">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {premiums.map((p) => (
                    <tr key={p.id} className="border-t border-border/40">
                      <td className="px-4 py-3 text-foreground">{p.payerName ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-foreground">{fmtKES(p.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.payType ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.payDate ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.receipt ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <PremiumDialog
                          policyUuid={policy.id}
                          premium={p}
                          onSaved={() =>
                            qc.invalidateQueries({ queryKey: ["policy-premiums", policyId] })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  {premiums.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        {premiumsLoading ? "Loading contributions…" : "No contributions recorded."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={"rounded-3xl p-7 text-white " + tone}>
            <div className="text-xs uppercase tracking-wider opacity-80">Status</div>
            <div className="mt-2 flex items-center gap-2 font-serif text-3xl capitalize">
              <ShieldCheck className="h-6 w-6" />
              {policy.status}
            </div>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <div className="text-xs uppercase tracking-wider opacity-70">Policy value</div>
            <div className="mt-2 font-serif text-4xl">{fmtKES(policy.value)}</div>
            <div className="mt-4 text-xs uppercase tracking-wider opacity-70">
              Total contributed
            </div>
            <div className="mt-1 font-serif text-2xl">{fmtKES(totalPaid)}</div>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h3 className="font-serif text-lg">Dates</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Enrolled</dt>
                <dd className="text-foreground">{policy.enrollDate ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Start</dt>
                <dd className="text-foreground">{policy.startDate ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Effective</dt>
                <dd className="text-foreground">{policy.effectiveDate ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expiry</dt>
                <dd className="text-foreground">{policy.expiryDate ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
