import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, Plus, Send, Trash2, CheckCircle2 } from "lucide-react";
import { OrganizationLogo } from "@/components/brand/organization-logo";
import { fetchPublicBranding } from "@/lib/public-branding";
import {
  fetchPublicHealthFacilities,
  searchPublicInsurees,
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";

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

// Client-filtered picker over a pre-fetched catalog (diagnoses, medical
// items/services) -- these lists can be large and the search-arg name for
// the underlying openIMIS query isn't confirmed, so filtering happens in
// the browser over one fetched page rather than a server-side search.
function CatalogCombobox({
  entries,
  value,
  onChange,
  placeholder,
  loading,
}: {
  entries: CatalogEntry[];
  value: CatalogEntry | null;
  onChange: (entry: CatalogEntry) => void;
  placeholder: string;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={loading}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {loading ? "Loading…" : value ? `${value.code} — ${value.name}` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {entries.map((e) => (
              <CommandItem
                key={e.id}
                value={`${e.code} ${e.name}`}
                onSelect={() => {
                  onChange(e);
                  setOpen(false);
                }}
              >
                <Check className={value?.id === e.id ? "opacity-100" : "opacity-0"} />
                {e.code} — {e.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_90px_120px_36px] items-start gap-2">
            <CatalogCombobox
              entries={catalog}
              value={row.entry}
              onChange={(entry) => update(row.key, { entry })}
              placeholder="Select…"
              loading={loading}
            />
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="Qty"
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-0.5 text-muted-foreground hover:text-[color:var(--risk-high)]"
              onClick={() => remove(row.key)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
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
  const searchPatientsFn = useServerFn(searchPublicInsurees);
  const fetchDiagnosesFn = useServerFn(fetchDiagnoses);
  const fetchItemsFn = useServerFn(fetchMedicalItems);
  const fetchServicesFn = useServerFn(fetchMedicalServices);
  const submitClaimFn = useServerFn(submitHospitalClaim);

  const { data: branding } = useQuery({
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

  const [patientQuery, setPatientQuery] = useState("");
  const [debouncedPatientQuery, setDebouncedPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Insuree | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPatientQuery(patientQuery), 300);
    return () => clearTimeout(t);
  }, [patientQuery]);
  const { data: patientResults = [], isFetching: patientSearching } = useQuery({
    queryKey: ["public-patient-search", debouncedPatientQuery],
    queryFn: () => searchPatientsFn({ data: { chfId: debouncedPatientQuery } }),
    enabled: debouncedPatientQuery.trim().length >= 3,
  });

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
    setPatientQuery("");
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
          <OrganizationLogo logoUrl={branding?.logoUrl} className="h-12" />
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
                <Label className="text-sm font-medium">Patient CHF ID</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Start typing a CHF ID…"
                  value={selectedPatient ? selectedPatient.chfId : patientQuery}
                  onChange={(e) => {
                    setSelectedPatient(null);
                    setPatientQuery(e.target.value);
                  }}
                />
                {!selectedPatient && debouncedPatientQuery.trim().length >= 3 && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-border">
                    {patientSearching ? (
                      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                      </div>
                    ) : patientResults.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No matching patient.</div>
                    ) : (
                      patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span>{p.name}</span>
                          <span className="text-muted-foreground">{p.chfId}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedPatient && (
                  <p className="mt-1.5 text-xs text-[color:var(--risk-low)]">
                    Selected: {selectedPatient.name}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Diagnosis</Label>
                <div className="mt-1.5">
                  <CatalogCombobox
                    entries={diagnoses}
                    value={diagnosis}
                    onChange={setDiagnosis}
                    placeholder="Select a diagnosis"
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
