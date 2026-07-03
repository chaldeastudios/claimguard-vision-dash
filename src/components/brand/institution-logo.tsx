import type { Institution } from "@/lib/institutions";

// Renders the connected institution's own logo where the switcher is used.
// No real logo assets exist yet for the demo institutions (logoUrl is null),
// so this falls back to an initials badge in the single, locked ClaimGuard
// brand color -- institutions no longer carry their own color scheme, only
// their own logo (see src/lib/institutions.ts).
export function InstitutionLogo({
  institution,
  className = "h-9 w-9",
}: {
  institution: Institution;
  className?: string;
}) {
  if (institution.logoUrl) {
    return (
      <img
        src={institution.logoUrl}
        alt={institution.name}
        className={`${className} rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center rounded-full bg-[color:var(--brand-brown)] font-serif text-sm text-[color:var(--brand-brown-foreground)]`}
      aria-label={institution.name}
      title={institution.name}
    >
      {institution.initials}
    </div>
  );
}
