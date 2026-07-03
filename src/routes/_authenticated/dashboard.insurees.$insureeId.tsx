import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchInsuree } from "@/lib/families-api";
import { InsureeEditDialog } from "@/components/insuree-edit-dialog";
import { ArrowLeft, Crown, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/insurees/$insureeId")({
  component: InsureeDetail,
  notFoundComponent: () => <div className="p-10 text-muted-foreground">Insuree not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">
      Something went wrong loading this insuree. {error.message}
    </div>
  ),
});

const GENDER_LABELS: Record<string, string> = { M: "Male", F: "Female" };

function InsureeDetail() {
  const { insureeId } = Route.useParams();
  const qc = useQueryClient();
  const fetchInsureeFn = useServerFn(fetchInsuree);

  const {
    data: insuree,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["insuree", insureeId],
    queryFn: async () => {
      const i = await fetchInsureeFn({ data: { insureeId } });
      if (!i) throw notFound();
      return i;
    },
  });

  if (isError) {
    return (
      <div className="p-10 text-sm text-[color:var(--risk-high)]">
        Failed to load insuree from openIMIS:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (isLoading || !insuree) {
    return <div className="p-10 text-muted-foreground">Loading insuree…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        {insuree.familyId ? (
          <Link
            to="/dashboard/families/$familyId"
            params={{ familyId: insuree.familyId }}
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
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 font-serif text-4xl">
            {insuree.head && <Crown className="h-7 w-7 text-[color:var(--brand-orange)]" />}
            <span className="accent-word">{insuree.name}</span>
          </h1>
          <InsureeEditDialog
            insuree={insuree}
            onSaved={() => qc.invalidateQueries({ queryKey: ["insuree", insureeId] })}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
          <h2 className="flex items-center gap-2 font-serif text-xl">
            <User className="h-4 w-4 text-[color:var(--brand-orange)]" />
            Insuree details
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">CHF ID</dt>
              <dd className="text-foreground">{insuree.chfId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date of birth</dt>
              <dd className="text-foreground">{insuree.dob ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="text-foreground">
                {insuree.gender
                  ? (GENDER_LABELS[insuree.gender] ?? insuree.gender)
                  : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Household role</dt>
              <dd className="text-foreground">{insuree.head ? "Head of household" : "Member"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{insuree.phone ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{insuree.email ?? "Not recorded"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Village</dt>
              <dd className="text-foreground">{insuree.village ?? "Not recorded"}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <div className="text-xs uppercase tracking-wider opacity-70">CHF ID</div>
            <div className="mt-2 font-serif text-3xl">{insuree.chfId}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
