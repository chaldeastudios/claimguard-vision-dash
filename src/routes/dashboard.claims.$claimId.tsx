import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getClaim, fmtKES } from "@/lib/claims-data";

export const Route = createFileRoute("/dashboard/claims/$claimId")({
  loader: ({ params }) => {
    const claim = getClaim(params.claimId);
    if (!claim) throw notFound();
    return { claim };
  },
  component: ClaimDetail,
  notFoundComponent: () => (
    <div className="p-10 text-muted-foreground">Claim not found.</div>
  ),
});

function ClaimDetail() {
  const { claim: c } = Route.useLoaderData();
  const tone =
    c.riskLevel === "High"
      ? "bg-[color:var(--risk-high)]"
      : c.riskLevel === "Medium"
        ? "bg-[color:var(--risk-med)]"
        : "bg-[color:var(--risk-low)]";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/dashboard/claims"
            className="text-sm text-[color:var(--brand-brown)] hover:underline"
          >
            ← Back to queue
          </Link>
          <h1 className="mt-2 font-serif text-4xl">
            Claim <span className="accent-word">{c.id}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full bg-[color:var(--risk-low)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Approve
          </button>
          <button className="rounded-full bg-[color:var(--brand-orange)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Flag for Investigation
          </button>
          <button className="rounded-full bg-[color:var(--risk-high)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Reject
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h2 className="font-serif text-xl">Why this was flagged</h2>
            <ol className="mt-5 space-y-4">
              {c.reasons.map((r, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-brown)] text-xs font-medium text-white">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-foreground">{r.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{r.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h2 className="font-serif text-xl">Claim details</h2>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Patient</dt>
                <dd className="text-foreground">{c.patient} ({c.patientId})</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Facility</dt>
                <dd className="text-foreground">{c.facility}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Diagnosis</dt>
                <dd className="text-foreground">{c.diagnosisCode} — {c.diagnosis}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-foreground">{new Date(c.submittedAt).toLocaleString("en-KE")}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Services billed</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {c.services.map((s) => (
                    <span key={s} className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className={"rounded-3xl p-7 text-white " + tone}>
            <div className="text-xs uppercase tracking-wider opacity-80">Risk score</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-serif text-6xl leading-none">{c.riskScore}</div>
              <div className="text-sm opacity-80">/ 100</div>
            </div>
            <div className="mt-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              {c.riskLevel} risk
            </div>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <div className="text-xs uppercase tracking-wider opacity-70">Claim amount</div>
            <div className="mt-2 font-serif text-4xl">{fmtKES(c.amount)}</div>
            <div className="mt-3 text-xs opacity-70">
              {c.diagnosisCode} median for scheme: {fmtKES(Math.round(c.amount / 2.6))}
            </div>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h3 className="font-serif text-lg">Reviewer notes</h3>
            <textarea
              placeholder="Add an internal note about this claim…"
              className="mt-3 h-28 w-full resize-none rounded-2xl bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[color:var(--brand-brown)]/40"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
