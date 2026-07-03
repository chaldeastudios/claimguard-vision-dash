import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/_authenticated/dashboard/claims/$claimId")({
  component: ClaimDetail,
  notFoundComponent: () => <div className="p-10 text-muted-foreground">Claim not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">
      Something went wrong loading this claim. {error.message}
    </div>
  ),
});

function ClaimDetail() {
  const { claimId } = Route.useParams();
  const qc = useQueryClient();
  const fetchClaimFn = useServerFn(fetchClaim);
  const analyzeFn = useServerFn(analyzeClaim);
  const [analyzing, setAnalyzing] = useState(false);

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
    queryFn: () => fetchLatestAnalysis(claimId),
    enabled: !!c,
  });

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await analyzeFn({ data: { claimId } });
      qc.invalidateQueries({ queryKey: ["analysis", claimId] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      toast.success("AI analysis complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (isError) {
    return (
      <div className="p-10 text-sm text-[color:var(--risk-high)]">
        Failed to load claim from openIMIS:{" "}
        {claimError instanceof Error ? claimError.message : String(claimError)}
      </div>
    );
  }

  if (isLoading || !c) {
    return <div className="p-10 text-muted-foreground">Loading claim…</div>;
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
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--risk-low)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            <CheckCircle2 className="h-4 w-4" /> Approve
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-orange)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            <AlertTriangle className="h-4 w-4" /> Flag for Investigation
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--risk-high)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            <XCircle className="h-4 w-4" /> Reject
          </button>
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
                    ? `${analysis.model} · ${new Date(analysis.created_at).toLocaleString("en-KE")}`
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
                  <p className="mt-1 text-sm text-foreground">{analysis.summary}</p>
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
            <h2 className="font-serif text-xl">Claim details</h2>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Patient</dt>
                <dd className="text-foreground">
                  {c.insureeId ? (
                    <Link
                      to="/dashboard/insurees/$insureeId"
                      params={{ insureeId: c.insureeId }}
                      className="text-[color:var(--brand-brown)] hover:underline"
                    >
                      {c.patient} ({c.patientId})
                    </Link>
                  ) : (
                    <>
                      {c.patient} ({c.patientId})
                    </>
                  )}
                </dd>
              </div>
              {c.familyId && (
                <div>
                  <dt className="text-muted-foreground">Household</dt>
                  <dd className="text-foreground">
                    <Link
                      to="/dashboard/families/$familyId"
                      params={{ familyId: c.familyId }}
                      className="text-[color:var(--brand-brown)] hover:underline"
                    >
                      View household & policies
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Facility</dt>
                <dd className="text-foreground">{c.facility}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Diagnosis</dt>
                <dd className="text-foreground">
                  {c.diagnosisCode} — {c.diagnosis}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-foreground">
                  {new Date(c.submittedAt).toLocaleString("en-KE")}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Services billed</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {c.services.length ? (
                    c.services.map((s: string) => (
                      <span
                        key={s}
                        className="rounded-full bg-background px-3 py-1 text-xs text-foreground"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Not recorded in openIMIS for this claim.
                    </span>
                  )}
                </dd>
              </div>
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

          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <div className="text-xs uppercase tracking-wider opacity-70">Claim amount</div>
            <div className="mt-2 font-serif text-4xl">{fmtKES(c.amount)}</div>
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
