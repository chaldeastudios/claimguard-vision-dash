import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { createClaim } from "@/lib/create-claim.functions";
import { analyzeClaim } from "@/lib/ai-analysis.functions";
import { pendingClaimIds } from "@/lib/pending-analysis";
import { HOSPITALS, DIAGNOSES, SERVICES, KENYAN_NAMES } from "@/lib/medical-presets";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/claims/new")({
  head: () => ({ meta: [{ title: "New Claim — ClaimGuard" }] }),
  component: NewClaim,
});

function NewClaim() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createClaim);
  const analyze = useServerFn(analyzeClaim);

  const today = new Date().toISOString().slice(0, 10);
  const [patient, setPatient] = useState("");
  const [patientId, setPatientId] = useState("");
  const [facility, setFacility] = useState(HOSPITALS[0]);
  const [diagnosisCode, setDiagnosisCode] = useState(DIAGNOSES[0].code);
  const [services, setServices] = useState<string[]>([SERVICES[0]]);
  const [amount, setAmount] = useState<string>("");
  const [submittedAt, setSubmittedAt] = useState(today);
  const [busy, setBusy] = useState(false);

  function addService(s: string) {
    if (!s || services.includes(s)) return;
    setServices([...services, s]);
  }
  function removeService(s: string) {
    setServices(services.filter((x) => x !== s));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const diag = DIAGNOSES.find((d) => d.code === diagnosisCode);
      if (!diag) throw new Error("Select a diagnosis");
      if (services.length === 0) throw new Error("Add at least one service");
      const amt = parseInt(amount, 10);
      if (!amt || amt <= 0) throw new Error("Enter a valid claim amount");
      const patientFinal = patient.trim() || KENYAN_NAMES[Math.floor(Math.random() * KENYAN_NAMES.length)];
      const pidFinal = patientId.trim() || `PT-${Math.floor(Math.random() * 900000 + 100000)}`;

      const claim = await create({
        data: {
          patient: patientFinal,
          patientId: pidFinal,
          facility,
          diagnosisCode: diag.code,
          diagnosis: diag.name,
          services,
          amount: amt,
          submittedAt: new Date(submittedAt).toISOString(),
        },
      });

      toast.success("Claim submitted — AI analysis running");
      pendingClaimIds.add(claim.id);
      qc.invalidateQueries({ queryKey: ["claims"] });

      // Fire-and-forget AI analysis; queue auto-refreshes via polling.
      analyze({ data: { claimId: claim.id } })
        .then(() => {
          pendingClaimIds.delete(claim.id);
          qc.invalidateQueries({ queryKey: ["analysis", claim.id] });
          qc.invalidateQueries({ queryKey: ["claims"] });
        })
        .catch((err) => {
          pendingClaimIds.delete(claim.id);
          console.error("AI analysis failed", err);
          toast.error("AI analysis failed for " + claim.id);
        });

      navigate({ to: "/dashboard/claims/$claimId", params: { claimId: claim.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit claim");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard/claims"
          className="inline-flex items-center gap-1 text-sm text-[color:var(--brand-brown)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
        </Link>
        <h1 className="mt-2 font-serif text-4xl">
          New <span className="accent-word">Claim</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enter a claim as if it came through OpenIMIS. Risk analysis runs automatically on submit.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5 rounded-3xl bg-[color:var(--brand-cream)] p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient name">
              <input
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                placeholder="e.g. Wanjiku Kamau"
                className="input"
              />
            </Field>
            <Field label="Patient ID">
              <input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="auto-generated if blank"
                className="input"
              />
            </Field>
          </div>

          <Field label="Hospital / facility">
            <select value={facility} onChange={(e) => setFacility(e.target.value)} className="input">
              {HOSPITALS.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </Field>

          <Field label="Diagnosis (ICD-10)">
            <select
              value={diagnosisCode}
              onChange={(e) => setDiagnosisCode(e.target.value)}
              className="input"
            >
              {DIAGNOSES.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Services billed">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs text-foreground"
                  >
                    {s}
                    <button type="button" onClick={() => removeService(s)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value=""
                  onChange={(e) => {
                    addService(e.target.value);
                    e.currentTarget.value = "";
                  }}
                >
                  <option value="">+ Add a service…</option>
                  {SERVICES.filter((s) => !services.includes(s)).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Claim amount (KES)">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 42500"
                className="input"
                required
              />
            </Field>
            <Field label="Submission date">
              <input
                type="date"
                value={submittedAt}
                onChange={(e) => setSubmittedAt(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <h3 className="font-serif text-lg">What happens on submit</h3>
            <ol className="mt-4 space-y-3 text-sm opacity-90">
              <li>1. Claim is written to the OpenIMIS-equivalent claims table.</li>
              <li>2. You're taken to the claim detail view.</li>
              <li>3. ClaimGuard's AI analyzes the claim in the background.</li>
              <li>4. The risk score, level and reasoning appear automatically.</li>
            </ol>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--brand-brown)] px-5 py-3 text-sm font-medium text-[color:var(--brand-brown-foreground)] hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {busy ? "Submitting…" : "Submit claim & run analysis"}
          </button>
        </div>
      </form>

      <style>{`
        .input {
          width: 100%;
          border-radius: 9999px;
          background: var(--background);
          padding: 0.55rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { box-shadow: 0 0 0 2px color-mix(in oklab, var(--brand-brown) 40%, transparent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
