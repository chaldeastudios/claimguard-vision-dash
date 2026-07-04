import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchClaim,
  fetchLatestAnalysis,
  fmtKES,
  type FraudReason,
  type RiskLevel,
} from "@/lib/claims-api";
import { analyzeClaim } from "@/lib/ai-analysis.functions";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/skeletons";

// autoAnalyze lets an external deep link (the openIMIS claims list's "AI
// Analysis" button, see the openimis-fe-fraud_js module) land here and
// immediately kick off analysis instead of requiring a second click.
export const Route = createFileRoute("/_authenticated/dashboard/claims/$claimId")({
  validateSearch: (search: Record<string, unknown>): { autoAnalyze?: boolean } => ({
    autoAnalyze: search.autoAnalyze === "1" || search.autoAnalyze === true ? true : undefined,
  }),
  component: ClaimDetail,
  notFoundComponent: () => <div className="p-10 text-muted-foreground">Claim not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">
      Something went wrong loading this claim. {error.message}
    </div>
  ),
});

// Reveals text a few characters at a time, like a model streaming its
// response -- only used right after a fresh "Run AI analysis" completes
// (see justAnalyzed below), not on every page load of an old analysis.
function TypewriterText({ text, speedMs = 12 }: { text: string; speedMs?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  const done = count >= text.length;
  return (
    <>
      {text.slice(0, count)}
      {!done && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" />
      )}
    </>
  );
}

function RecommendationIcon({ recommendation }: { recommendation: string }) {
  if (recommendation === "approve")
    return <CheckCircle2 className="h-4 w-4 text-[color:var(--risk-low)]" />;
  if (recommendation === "reject")
    return <XCircle className="h-4 w-4 text-[color:var(--risk-high)]" />;
  return <AlertTriangle className="h-4 w-4 text-[color:var(--brand-orange)]" />;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function ClaimDetail() {
  const { claimId } = Route.useParams();
  const { autoAnalyze } = Route.useSearch();
  const qc = useQueryClient();
  const fetchClaimFn = useServerFn(fetchClaim);
  const fetchAnalysisFn = useServerFn(fetchLatestAnalysis);
  const analyzeFn = useServerFn(analyzeClaim);
  const [analyzing, setAnalyzing] = useState(false);
  const [justAnalyzed, setJustAnalyzed] = useState(false);
  const [autoAnalyzeFired, setAutoAnalyzeFired] = useState(false);

  const {
    data: c,
    isLoading,
    isError,
    error: claimError,
  } = useQuery({
    queryKey: ["claim", claimId],
    queryFn: async () => {
      const claim = await fetchClaimFn({ data: { claimId } });
      if (!claim) throw notFound();
      return claim;
    },
  });

  const { data: analysis } = useQuery({
    queryKey: ["analysis", claimId],
    queryFn: () => fetchAnalysisFn({ data: { claimId } }),
    enabled: !!c,
  });

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await analyzeFn({ data: { claimId } });
      await qc.invalidateQueries({ queryKey: ["analysis", claimId] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      setJustAnalyzed(true);
      toast.success("AI analysis complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    if (!autoAnalyze || autoAnalyzeFired || !c || analysis || analyzing) return;
    setAutoAnalyzeFired(true);
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze, autoAnalyzeFired, c, analysis, analyzing]);

  if (isError) {
    return (
      <div className="p-10 text-sm text-[color:var(--risk-high)]">
        Failed to load claim from openIMIS:{" "}
        {claimError instanceof Error ? claimError.message : String(claimError)}
      </div>
    );
  }

  if (isLoading || !c) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-9 w-72 max-w-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={4} />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <SkeletonCard lines={4} />
          </div>
        </div>
      </div>
    );
  }

  const level = analysis?.risk_level as RiskLevel | undefined;
  const tone =
    level === "High"
      ? "bg-[color:var(--risk-high)]"
      : level === "Medium"
        ? "bg-[color:var(--risk-med)]"
        : level === "Low"
          ? "bg-[color:var(--risk-low)]"
          : "bg-[color:var(--brand-brown)]";

  const reasons: FraudReason[] = analysis ? (analysis.reasons as unknown as FraudReason[]) : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-[color:var(--brand-brown)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
          </Link>
          <h1 className="mt-2 font-serif text-4xl">
            Claim <span className="accent-word">{c.code}</span>
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-serif text-xl">
                  <Sparkles className="h-4 w-4 text-[color:var(--brand-orange)]" />
                  Why this was flagged
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {analysis
                    ? new Date(analysis.created_at).toLocaleString("en-KE")
                    : analyzing
                      ? "AI analysis is running for this claim…"
                      : "Not yet analyzed."}
                </p>
              </div>
              {!analysis && (
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[color:var(--brand-brown)] px-5 py-2.5 text-sm font-medium text-[color:var(--brand-brown-foreground)] hover:opacity-90 disabled:opacity-60"
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {analyzing ? "Analyzing…" : "Run AI analysis"}
                </button>
              )}
            </div>

            {analysis ? (
              <>
                <div className="mt-5 rounded-2xl border border-[color:var(--brand-brown)]/20 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    AI summary
                  </div>
                  <p className="mt-1 min-h-5 text-sm text-foreground">
                    {justAnalyzed ? <TypewriterText text={analysis.summary} /> : analysis.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full bg-foreground/5 px-2.5 py-1">
                      Score {analysis.risk_score}/100
                    </span>
                    <span className="rounded-full bg-foreground/5 px-2.5 py-1">
                      {analysis.risk_level} risk
                    </span>
                    <span className="rounded-full bg-[color:var(--brand-orange)]/15 px-2.5 py-1 capitalize text-[color:var(--brand-orange)]">
                      Recommend: {analysis.recommendation}
                    </span>
                  </div>
                </div>

                <ol className="mt-5 space-y-4">
                  {reasons.map((r, i) => (
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
              </>
            ) : analyzing ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-background/60 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-[color:var(--brand-orange)]" />
                AI is analyzing this claim…
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-background/60 p-6 text-sm text-muted-foreground">
                No analysis yet. Run AI analysis to score this claim for fraud risk.
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h2 className="font-serif text-xl">Overview</h2>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field
                label="Patient"
                value={
                  c.insureeId ? (
                    <Link
                      to="/dashboard/insurees/$insureeId"
                      params={{ insureeId: c.insureeId }}
                      className="text-[color:var(--brand-brown)] hover:underline"
                    >
                      {c.patient} ({c.patientId})
                    </Link>
                  ) : (
                    `${c.patient} (${c.patientId})`
                  )
                }
              />
              {c.familyId && (
                <Field
                  label="Household"
                  value={
                    <Link
                      to="/dashboard/families/$familyId"
                      params={{ familyId: c.familyId }}
                      className="text-[color:var(--brand-brown)] hover:underline"
                    >
                      View household & policies
                    </Link>
                  }
                />
              )}
              <Field label="Facility" value={c.facility} />
              <Field label="Visit type" value={c.visitType} />
              <Field label="Care type" value={c.careType} />
              <Field label="Category" value={c.category} />
              <Field
                label="Service dates"
                value={c.dateFrom || c.dateTo ? `${c.dateFrom ?? "?"} to ${c.dateTo ?? "?"}` : null}
              />
              <Field label="Submitted" value={new Date(c.submittedAt).toLocaleString("en-KE")} />
              <Field label="Status" value={<span className="capitalize">{c.status}</span>} />
              <Field label="Patient condition" value={c.patientCondition} />
              <Field label="Guarantee ID" value={c.guaranteeId} />
              <Field label="Referral code" value={c.referralCode} />
              <Field
                label="Pre-authorization"
                value={c.preAuthorization == null ? null : c.preAuthorization ? "Yes" : "No"}
              />
            </dl>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h2 className="font-serif text-xl">Diagnosis</h2>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field
                label="Primary"
                value={c.diagnosisCode ? `${c.diagnosisCode} — ${c.diagnosis}` : null}
              />
              <Field
                label="Secondary"
                value={
                  c.otherDiagnoses.length
                    ? c.otherDiagnoses.map((d) => `${d.code} — ${d.name}`).join("; ")
                    : null
                }
              />
            </dl>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h2 className="font-serif text-xl">Items & services billed</h2>
            <div className="mt-5 overflow-hidden rounded-2xl bg-background/60">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Asked</th>
                    <th className="px-4 py-3 text-right">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {c.lineItems.map((li, i) => (
                    <tr key={`${li.kind}-${li.code}-${i}`} className="border-t border-border/40">
                      <td className="px-4 py-3 text-foreground">{li.code}</td>
                      <td className="px-4 py-3 text-foreground">{li.name}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{li.kind}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {li.quantityProvided ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {li.priceAsked != null ? fmtKES(li.priceAsked) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {li.priceApproved != null ? fmtKES(li.priceApproved) : "—"}
                      </td>
                    </tr>
                  ))}
                  {c.lineItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Not recorded in openIMIS for this claim.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
            <h2 className="font-serif text-xl">Workflow & review</h2>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field label="Feedback status" value={c.feedbackStatus} />
              <Field label="Review status" value={c.reviewStatus} />
              <Field label="Approval status" value={c.approvalStatus} />
              <Field label="Rejection reason" value={c.rejectionReason} />
              <Field label="Processed" value={c.dateProcessed} />
              {c.explanation && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Explanation</dt>
                  <dd className="text-foreground">{c.explanation}</dd>
                </div>
              )}
              {c.adjustment && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Adjustment</dt>
                  <dd className="text-foreground">{c.adjustment}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className={"rounded-3xl p-7 text-white " + tone}>
            <div className="text-xs uppercase tracking-wider opacity-80">Risk score</div>
            {analysis ? (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <div className="font-serif text-6xl leading-none">{analysis.risk_score}</div>
                  <div className="text-sm opacity-80">/ 100</div>
                </div>
                <div className="mt-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  {analysis.risk_level} risk
                </div>
              </>
            ) : analyzing ? (
              <div className="mt-2 flex items-center gap-2 text-sm opacity-90">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
              </div>
            ) : (
              <div className="mt-2 text-sm opacity-90">Not yet analyzed</div>
            )}
          </div>

          {analysis && (
            <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
              <h3 className="flex items-center gap-2 font-serif text-lg">
                <RecommendationIcon recommendation={analysis.recommendation} />
                Recommended action
              </h3>
              <p className="mt-2 text-sm font-medium capitalize text-foreground">
                {analysis.recommendation}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                This is ClaimGuard's AI suggestion only — it doesn't act on the claim. To approve,
                investigate, or reject it, open this claim in openIMIS directly.
              </p>
            </div>
          )}

          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <div className="text-xs uppercase tracking-wider opacity-70">Financials</div>
            <div className="mt-2 font-serif text-4xl">{fmtKES(c.amount)}</div>
            <div className="mt-1 text-xs opacity-70">Claimed</div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="opacity-70">Approved</dt>
                <dd>{c.approved != null ? fmtKES(c.approved) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="opacity-70">Valuated</dt>
                <dd>{c.valuated != null ? fmtKES(c.valuated) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="opacity-70">Reinsured</dt>
                <dd>{c.reinsured != null ? fmtKES(c.reinsured) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="opacity-70">Remunerated</dt>
                <dd>{c.remunerated != null ? fmtKES(c.remunerated) : "—"}</dd>
              </div>
            </dl>
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
