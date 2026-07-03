import { LogoMark } from "@/components/brand/icons";

// Shows the signed-in account's uploaded organization logo (see
// src/lib/organization-logo.ts) wherever the dashboard shell needs
// branding. Falls back to the plain ClaimGuard wordmark before one's been
// uploaded, or pre-auth where there's no account to look a logo up for yet.
// Rendered contained (not cropped into a circular avatar) since real
// company logos are usually wide wordmarks, not headshots.
export function OrganizationLogo({
  logoUrl,
  className = "h-9",
}: {
  logoUrl: string | null | undefined;
  className?: string;
}) {
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
