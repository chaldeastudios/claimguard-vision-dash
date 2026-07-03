import { LogoMark } from "@/components/brand/icons";
import { Skeleton } from "@/components/ui/skeleton";

// Shows the signed-in account's uploaded organization logo (see
// src/lib/organization-logo.ts) wherever the dashboard shell needs
// branding. Falls back to the plain ClaimGuard wordmark before one's been
// uploaded, or pre-auth where there's no account to look a logo up for yet.
// Rendered contained (not cropped into a circular avatar) since real
// company logos are usually wide wordmarks, not headshots.
//
// `loading` should be set from the profile query's own isLoading -- without
// it, the very first render (before that query resolves) has no logoUrl yet
// and falls through to the ClaimGuard mark, which then gets swapped out for
// the real logo a moment later. That swap reads as an unwanted flash/flicker
// of the wrong brand, so callers that have a real loading state must pass it
// through rather than let this component guess from logoUrl alone.
export function OrganizationLogo({
  logoUrl,
  loading = false,
  className = "h-9",
}: {
  logoUrl: string | null | undefined;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return <Skeleton className={`${className} w-24 rounded-md`} />;
  }
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Organization logo"
        className={`${className} w-auto max-w-[180px] object-contain`}
      />
    );
  }
  return <LogoMark className={`${className} w-auto text-[color:var(--brand-brown)]`} />;
}
