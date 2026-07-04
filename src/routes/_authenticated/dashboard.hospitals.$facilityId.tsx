import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchHealthFacility } from "@/lib/healthfacility-api";
import { fetchClaims, fmtKES } from "@/lib/claims-api";
import { SkeletonDetailPage } from "@/components/skeletons";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";
import { getErrorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/_authenticated/dashboard/hospitals/$facilityId")({
  component: HospitalDetail,
  notFoundComponent: () => <div className="p-10 text-muted-foreground">Facility not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">
      Something went wrong loading this facility. {error.message}
    </div>
  ),
});

const RISK_TONE: Record<string, string> = {
  High: "text-[color:var(--risk-high)]",
  Medium: "text-[color:var(--risk-med)]",
  Low: "text-[color:var(--risk-low)]",
};

function HospitalDetail() {
  const { facilityId } = Route.useParams();
  const fetchHealthFacilityFn = useServerFn(fetchHealthFacility);
  const fetchClaimsFn = useServerFn(fetchClaims);

  const {
    data: facility,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["health-facility", facilityId],
    queryFn: async () => {
      const f = await fetchHealthFacilityFn({ data: { facilityId } });
      if (!f) throw notFound();
      return f;
    },
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["claims"],
    queryFn: () => fetchClaimsFn(),
    enabled: !!facility,
  });

  // Best-effort join by name -- claims only carry the facility name, not a
  // facility uuid (see dashboard.hospitals.index.tsx).
  const facilityClaims = useMemo(
    () => claims.filter((c) => c.facility === facility?.name),
    [claims, facility],
  );
  const highRisk = facilityClaims.filter((c) => c.analysis?.risk_level === "High").length;
  const totalValue = facilityClaims.reduce((s, c) => s + c.amount, 0);

  if (isError) {
    return (
      <div className="p-10 text-sm text-[color:var(--risk-high)]">
        Failed to load facility from openIMIS:{" "}
        {getErrorMessage(error)}
      </div>
    );
  }

  if (isLoading || claimsLoading || !facility) {
    return <SkeletonDetailPage />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/dashboard/hospitals"
          className="inline-flex items-center gap-1 text-sm text-[color:var(--brand-brown)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to hospitals
        </Link>
        <h1 className="mt-2 font-serif text-4xl">
          <span className="accent-word">{facility.name}</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {facility.code} · {facility.levelLabel}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
          <h2 className="flex items-center gap-2 font-serif text-xl">
            <Building2 className="h-4 w-4 text-[color:var(--brand-orange)]" />
            Facility details
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="text-foreground">{facility.levelLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Care type</dt>
              <dd className="text-foreground">{facility.careTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Legal form</dt>
              <dd className="text-foreground">{facility.legalForm ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="text-foreground">{facility.location ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{facility.phone ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{facility.email ?? "Not recorded"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-foreground">{facility.address ?? "Not recorded"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
          <div className="text-xs uppercase tracking-wider opacity-70">Claims submitted</div>
          <div className="mt-2 font-serif text-4xl">{facilityClaims.length}</div>
          <div className="mt-4 text-xs uppercase tracking-wider opacity-70">Total value</div>
          <div className="mt-1 font-serif text-2xl">{fmtKES(totalValue)}</div>
          <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
            <ShieldAlert className="h-4 w-4 text-[color:var(--risk-high)]" />
            {highRisk} flagged high-risk
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
        <h2 className="font-serif text-xl">Recent claims</h2>
        <div className="mt-5 overflow-hidden rounded-2xl bg-background/60">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Claim</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Diagnosis</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {facilityClaims.slice(0, 25).map((c) => (
                <tr key={c.id} className="border-t border-border/40 hover:bg-background/80">
                  <td className="px-4 py-3">
                    <Link
                      to="/dashboard/claims/$claimId"
                      params={{ claimId: c.id }}
                      className="font-medium text-[color:var(--brand-brown)] hover:underline"
                    >
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">{c.patient}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.diagnosis || "—"}</td>
                  <td className="px-4 py-3 text-right text-foreground">{fmtKES(c.amount)}</td>
                  <td className="px-4 py-3">
                    {c.analysis ? (
                      <span
                        className={
                          "font-medium " + (RISK_TONE[c.analysis.risk_level] ?? "text-foreground")
                        }
                      >
                        {c.analysis.risk_level}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not analyzed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.submittedAt).toLocaleDateString("en-KE")}
                  </td>
                </tr>
              ))}
              {facilityClaims.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No claims recorded for this facility yet.
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
