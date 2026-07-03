import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Send, Trash2, CheckCircle2, X } from "lucide-react";
import { OrganizationLogo } from "@/components/brand/organization-logo";
import { fetchPublicBranding } from "@/lib/public-branding";
import {
  fetchPublicHealthFacilities,
  searchPublicInsurees,
  searchPublicInsureesByName,
  submitHospitalClaim,
} from "@/lib/hospital-portal-api";
import {
  fetchDiagnoses,
  fetchMedicalItems,
  fetchMedicalServices,
  type CatalogEntry,
} from "@/lib/claim-catalog-api";
import type { Insuree } from "@/lib/insuree.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export const Route = createFileRoute("/hospital-portal")({
  head: () => ({ meta: [{ title: "Submit a Claim" }] }),
  component: HospitalPortal,
});

interface LineRow {
  key: string;
  entry: CatalogEntry | null;
  quantity: string;
  priceAsked: string;
}

function newRow(): LineRow {
  return { key: crypto.randomUUID(), entry: null, quantity: "1", priceAsked: "" };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function useDebounced(value: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

// Table-style search over a pre-fetched catalog (diagnoses, medical
// items/services) -- filtering is explicit (code or name substring, done
// here rather than left to a widget's own fuzzy matching) so a name search
// reliably surfaces matches, and shows a real table of results rather than
// a single-line combobox.
function CatalogTablePicker({
  entries,
  value,
  onChange,
  loading,
  placeholder,
}: {
  entries: CatalogEntry[];
  value: CatalogEntry | null;
  onChange: (entry: CatalogEntry | null) => void;
  loading: boolean;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? entries
      : entries.filter((e) => e.code.toLowerCase().includes(q) || e.name.toLowerCase().includes(q));
    return base.slice(0, 8);
  }, [entries, query]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className="truncate">
          {value.code} — {value.name}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <Input
        placeholder={loading ? "Loading…" : placeholder}
        disabled={loading}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!loading && (
        <div className="mt-2 max-h-56 overflow-y-auto overflow-x-hidden rounded-xl border border-border">
          {entries.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nothing loaded from openIMIS yet.</p>
          ) : filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches for "{query}".</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => onChange(e)}
                    className="cursor-pointer border-t border-border/60 hover:bg-accent"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">{e.code}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function LineItemsEditor({
  title,
  catalog,
  loading,
  rows,
  setRows,
}: {
  title: string;
  catalog: CatalogEntry[];
  loading: boolean;
  rows: LineRow[];
  setRows: (rows: LineRow[]) => void;
}) {
  function update(key: string, patch: Partial<LineRow>) {
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function remove(key: string) {
    setRows(rows.filter((r) => r.key !== key));
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setRows([...rows, newRow()])}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      <div className="mt-3 space-y-4">
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl border border-border/60 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <CatalogTablePicker
                  entries={catalog}
                  value={row.entry}
                  onChange={(entry) => update(row.key, { entry })}
                  placeholder="Search by code or name…"
                  loading={loading}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-[color:var(--risk-high)]"
                onClick={() => remove(row.key)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Quantity"
                value={row.quantity}
                onChange={(e) => update(row.key, { quantity: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price asked"
                value={row.priceAsked}
                onChange={(e) => update(row.key, { priceAsked: e.target.value })}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No {title.toLowerCase()} added.</p>
        )}
      </div>
    </div>
  );
}

function HospitalPortal() {
  const fetchBrandingFn = useServerFn(fetchPublicBranding);
  const fetchFacilitiesFn = useServerFn(fetchPublicHealthFacilities);
  const searchPatientsByChfFn = useServerFn(searchPublicInsurees);
  const searchPatientsByNameFn = useServerFn(searchPublicInsureesByName);
  const fetchDiagnosesFn = useServerFn(fetchDiagnoses);
  const fetchItemsFn = useServerFn(fetchMedicalItems);
  const fetchServicesFn = useServerFn(fetchMedicalServices);
  const submitClaimFn = useServerFn(submitHospitalClaim);

  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ["public-branding"],
    queryFn: () => fetchBrandingFn(),
  });
  const { data: facilities = [] } = useQuery({
    queryKey: ["public-health-facilities"],
    queryFn: () => fetchFacilitiesFn(),
  });
  const { data: diagnoses = [], isLoading: diagnosesLoading } = useQuery({
    queryKey: ["public-diagnoses"],
    queryFn: () => fetchDiagnosesFn(),
  });
  const { data: medicalItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["public-medical-items"],
    queryFn: () => fetchItemsFn(),
  });
  const { data: medicalServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["public-medical-services"],
    queryFn: () => fetchServicesFn(),
  });

  const [facilityId, setFacilityId] = useState("");

  // Patient search: either field can be used to search, and picking a
  // result fills both -- so a hospital clerk who only knows the patient's
  // name doesn't need to also hunt down their CHF ID first.
  const [nameQuery, setNameQuery] = useState("");
  const [chfQuery, setChfQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Insuree | null>(null);
  const debouncedName = useDebounced(nameQuery);
  const debouncedChf = useDebounced(chfQuery);

  const { data: nameResults = [], isFetching: nameSearching } = useQuery({
    queryKey: ["public-patient-search-name", debouncedName],
    queryFn: () => searchPatientsByNameFn({ data: { name: debouncedName } }),
    enabled: !selectedPatient && debouncedName.trim().length >= 3,
  });
  const { data: chfResults = [], isFetching: chfSearching } = useQuery({
    queryKey: ["public-patient-search-chf", debouncedChf],
    queryFn: () => searchPatientsByChfFn({ data: { chfId: debouncedChf } }),
    enabled: !selectedPatient && debouncedChf.trim().length >= 3,
  });

  const patientResults = useMemo(() => {
    const byId = new Map<string, Insuree>();
    for (const p of [...chfResults, ...nameResults]) byId.set(p.id, p);
    return Array.from(byId.values());
  }, [chfResults, nameResults]);
  const patientSearching = nameSearching || chfSearching;
  const patientSearchActive =
    !selectedPatient && (debouncedName.trim().length >= 3 || debouncedChf.trim().length >= 3);

  function selectPatient(p: Insuree) {
    setSelectedPatient(p);
    setNameQuery(p.name);
    setChfQuery(p.chfId);
  }

  function handleNameChange(v: string) {
    setNameQuery(v);
    if (selectedPatient && v !== selectedPatient.name) setSelectedPatient(null);
  }
  function handleChfChange(v: string) {
    setChfQuery(v);
    if (selectedPatient && v !== selectedPatient.chfId) setSelectedPatient(null);
  }

  const [diagnosis, setDiagnosis] = useState<CatalogEntry | null>(null);
  const [dateFrom, setDateFrom] = useState(today());
  const [explanation, setExplanation] = useState("");
  const [items, setItems] = useState<LineRow[]>([]);
  const [services, setServices] = useState<LineRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const estimatedTotal = useMemo(() => {
    const sum = (rows: LineRow[]) =>
      rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.priceAsked) || 0), 0);
    return sum(items) + sum(services);
  }, [items, services]);

  const facility = facilities.find((f) => f.id === facilityId) ?? null;
  const canSubmit = !!facility && !!selectedPatient && !!diagnosis && !!dateFrom && !submitting;

  function resetForm() {
    setFacilityId("");
    setNameQuery("");
    setChfQuery("");
    setSelectedPatient(null);
    setDiagnosis(null);
    setDateFrom(today());
    setExplanation("");
    setItems([]);
    setServices([]);
  }

  async function handleSubmit() {
    if (!facility?.globalId || !selectedPatient?.globalId || !diagnosis?.globalId) {
      toast.error("Select a facility, patient, and diagnosis before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const toLine = (rows: LineRow[]) =>
        rows
          .filter((r) => r.entry?.globalId && Number(r.quantity) > 0 && Number(r.priceAsked) > 0)
          .map((r) => ({
            globalId: r.entry!.globalId!,
            quantity: Number(r.quantity),
            priceAsked: Number(r.priceAsked),
          }));

      const result = await submitClaimFn({
        data: {
          insureeGlobalId: selectedPatient.globalId,
          healthFacilityGlobalId: facility.globalId,
          icdGlobalId: diagnosis.globalId,
          dateFrom,
          dateClaimed: today(),
          visitType: null,
          explanation: explanation || null,
          items: toLine(items),
          services: toLine(services),
        },
      });
      setConfirmation(result.code);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)]">
      <header className="border-b border-border/40 bg-background px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <OrganizationLogo
            logoUrl={branding?.logoUrl}
            loading={brandingLoading}
            className="h-12"
          />
          <div>
            <div className="font-serif text-2xl">
              {branding?.name ? `${branding.name} ` : ""}
              <span className="accent-word">Claim Submission</span>
            </div>
            <p className="text-sm text-muted-foreground">For registered facility staff</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 md:px-10">
        {confirmation ? (
          <div className="rounded-3xl bg-[color:var(--risk-low)]/10 p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[color:var(--risk-low)]" />
            <h1 className="mt-4 font-serif text-3xl">
              Claim <span className="accent-word">submitted</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Reference code <span className="font-medium text-foreground">{confirmation}</span>.
              This claim is now in your insurer's review queue.
            </p>
            <Button className="mt-6" onClick={() => setConfirmation(null)}>
              Submit another claim
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-4xl">
                Submit a <span className="accent-word">claim</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                Fill in the patient, diagnosis, and services provided. This goes straight into your
                insurer's system for review.
              </p>
            </div>

            <div className="rounded-3xl bg-background p-7 space-y-6">
              <div>
                <Label className="text-sm font-medium">Facility</Label>
                <Select value={facilityId} onValueChange={setFacilityId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Patient</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Search by name…"
                    value={nameQuery}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                  <Input
                    placeholder="Search by CHF ID…"
                    value={chfQuery}
                    onChange={(e) => handleChfChange(e.target.value)}
                  />
                </div>
                {patientSearchActive && (
                  <div className="mt-2 max-h-56 overflow-y-auto overflow-x-hidden rounded-xl border border-border">
                    {patientSearching ? (
                      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                      </div>
                    ) : patientResults.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">No matching patient.</p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">CHF ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientResults.map((p) => (
                            <tr
                              key={p.id}
                              onClick={() => selectPatient(p)}
                              className="cursor-pointer border-t border-border/60 hover:bg-accent"
                            >
                              <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{p.chfId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                {selectedPatient && (
                  <p className="mt-1.5 text-xs text-[color:var(--risk-low)]">
                    Selected: {selectedPatient.name} ({selectedPatient.chfId})
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Diagnosis</Label>
                <div className="mt-1.5">
                  <CatalogTablePicker
                    entries={diagnoses}
                    value={diagnosis}
                    onChange={setDiagnosis}
                    placeholder="Search by code or name…"
                    loading={diagnosesLoading}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Date of service</Label>
                <Input
                  className="mt-1.5 max-w-xs"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <LineItemsEditor
                title="Items billed"
                catalog={medicalItems}
                loading={itemsLoading}
                rows={items}
                setRows={setItems}
              />
              <LineItemsEditor
                title="Services billed"
                catalog={medicalServices}
                loading={servicesLoading}
                rows={services}
                setRows={setServices}
              />

              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea
                  className="mt-1.5"
                  placeholder="Anything the reviewer should know about this claim…"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[color:var(--brand-cream)] px-5 py-4">
                <span className="text-sm text-muted-foreground">Estimated claim amount</span>
                <span className="font-serif text-2xl">
                  KES {estimatedTotal.toLocaleString("en-KE")}
                </span>
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full gap-2"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit claim
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
