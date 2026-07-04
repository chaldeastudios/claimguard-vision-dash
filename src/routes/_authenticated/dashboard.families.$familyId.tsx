import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchFamily, fetchFamilyMembers } from "@/lib/families-api";
import { fetchPoliciesByFamily } from "@/lib/policy-api";
import { fmtKES } from "@/lib/claims-api";
import { FamilyEditDialog } from "@/components/family-edit-dialog";
import { SkeletonDetailPage } from "@/components/skeletons";
import { ArrowLeft, Crown, Users, ShieldCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/_authenticated/dashboard/families/$familyId")({
  component: FamilyDetail,
  notFoundComponent: () => <div className="p-10 text-muted-foreground">Family not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">
      Something went wrong loading this family. {error.message}
    </div>
  ),
});

function FamilyDetail() {
  const { familyId } = Route.useParams();
  const qc = useQueryClient();
  const fetchFamilyFn = useServerFn(fetchFamily);
  const fetchFamilyMembersFn = useServerFn(fetchFamilyMembers);

  const {
    data: family,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["family", familyId],
    queryFn: async () => {
      const f = await fetchFamilyFn({ data: { familyId } });
      if (!f) throw notFound();
      return f;
    },
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => fetchFamilyMembersFn({ data: { familyId } }),
    enabled: !!family,
  });

  const fetchPoliciesByFamilyFn = useServerFn(fetchPoliciesByFamily);
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["family-policies", familyId],
    queryFn: () => fetchPoliciesByFamilyFn({ data: { familyId } }),
    enabled: !!family,
  });

  if (isError) {
    return (
      <div className="p-10 text-sm text-[color:var(--risk-high)]">
        Failed to load family from openIMIS:{" "}
        {getErrorMessage(error)}
      </div>
    );
  }

  if (isLoading || membersLoading || policiesLoading || !family) {
    return <SkeletonDetailPage />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/dashboard/families"
          className="inline-flex items-center gap-1 text-sm text-[color:var(--brand-brown)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to families
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="font-serif text-4xl">
            <span className="accent-word">{family.headName}</span>'s household
          </h1>
          <FamilyEditDialog
            family={family}
            onSaved={() => qc.invalidateQueries({ queryKey: ["family", familyId] })}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
          <h2 className="flex items-center gap-2 font-serif text-xl">
            <Users className="h-4 w-4 text-[color:var(--brand-orange)]" />
            Household members
          </h2>
          <div className="mt-5 overflow-hidden rounded-2xl bg-background/60">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">CHF ID</th>
                  <th className="px-4 py-3">DOB</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-border/40 hover:bg-background/80">
                    <td className="px-4 py-3">
                      <Link
                        to="/dashboard/insurees/$insureeId"
                        params={{ insureeId: m.id }}
                        className="inline-flex items-center gap-1.5 font-medium text-[color:var(--brand-brown)] hover:underline"
                      >
                        {m.head && (
                          <Crown className="h-3.5 w-3.5 text-[color:var(--brand-orange)]" />
                        )}
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{m.chfId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.dob ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.gender ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.phone ?? "—"}</td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No members recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <div className="text-xs uppercase tracking-wider opacity-70">Location</div>
            <div className="mt-2 font-serif text-2xl">{family.location}</div>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h3 className="font-serif text-lg">Household details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd className="text-foreground">{family.address || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Confirmation number</dt>
                <dd className="text-foreground">{family.confirmationNo || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Poverty status</dt>
                <dd className="text-foreground">
                  {family.poverty ? "Below poverty line" : "Not flagged"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
        <h2 className="flex items-center gap-2 font-serif text-xl">
          <ShieldCheck className="h-4 w-4 text-[color:var(--brand-orange)]" />
          Policies
        </h2>
        <div className="mt-5 overflow-hidden rounded-2xl bg-background/60">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-t border-border/40 hover:bg-background/80">
                  <td className="px-4 py-3">
                    <Link
                      to="/dashboard/policies/$policyId"
                      params={{ policyId: p.id }}
                      className="font-medium text-[color:var(--brand-brown)] hover:underline"
                    >
                      {p.productCode} — {p.productName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-foreground">{p.status}</td>
                  <td className="px-4 py-3 text-right text-foreground">{fmtKES(p.value)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.enrollDate ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.expiryDate ?? "—"}</td>
                </tr>
              ))}
              {policies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No policies recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
