import { Skeleton } from "@/components/ui/skeleton";

// Shared building blocks for full-page loading skeletons. Each dashboard
// page composes these into a layout that roughly matches its real content,
// and gates rendering on ALL of its queries resolving together -- so a page
// with several independent fetches shows one coherent skeleton instead of
// each section popping in with its own "Loading..." text at a different
// moment.

export function SkeletonHeading({ width = "w-64" }: { width?: string }) {
  return (
    <div>
      <Skeleton className={`h-9 ${width}`} />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
    </div>
  );
}

export function SkeletonKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="mt-4 h-9 w-20" />
          <Skeleton className="mt-3 h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-5 py-4">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t border-border/40">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-5 py-4">
                  <Skeleton className="h-4 w-full max-w-[140px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
      <Skeleton className="h-5 w-32" />
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatBlock() {
  return (
    <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-32" />
    </div>
  );
}

// Generic detail-page skeleton (back-link + title + two-column card grid) --
// used by Insuree/Family/Policy/Hospital detail pages, whose real layouts
// are close enough in shape to share one loading placeholder.
export function SkeletonDetailPage() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-9 w-72 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <SkeletonCard lines={6} />
        <div className="space-y-6">
          <SkeletonStatBlock />
          <SkeletonCard lines={4} />
        </div>
      </div>
      <SkeletonTable rows={4} cols={4} />
    </div>
  );
}
