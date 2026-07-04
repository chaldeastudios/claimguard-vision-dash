// Hardcoded demo institutions -- six hospitals, six insurers -- checked
// straight into the repo instead of depending on Supabase `organizations`
// seeding, which proved unreliable under hackathon time pressure. Used by
// both the sign-in institution picker (auth-form.tsx, auth.functions.ts)
// and the hospital portal's "which insurer is this claim for" step
// (hospital-portal.tsx). Real institution names, generated placeholder
// logos (no real brand assets available for a demo).
export interface Institution {
  id: string;
  name: string;
  logoUrl: string;
}

// A small colored monogram per institution so cards are visually distinct
// without needing real logo image assets. Deterministic and self-contained
// (an inline SVG data URI) -- no network fetch, no external file.
function monogram(name: string, bg: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">` +
    `<rect width="64" height="64" rx="14" fill="${bg}"/>` +
    `<text x="32" y="41" font-family="IBM Plex Sans, Arial, sans-serif" font-size="24" ` +
    `font-weight="600" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Reusing the brand palette (see src/styles.css's --brand-* tokens) plus a
// few extra hues so all twelve cards read as distinct.
const COLORS = ["#8D6959", "#A1A16A", "#FB6032", "#5B7C99", "#B0568C", "#C97A3D"];

export const HOSPITALS: Institution[] = [
  "Kenyatta National Hospital",
  "Aga Khan University Hospital",
  "Nakuru Level 5 Hospital",
  "Moi Teaching and Referral Hospital",
  "Coast General Teaching and Referral Hospital",
  "Mater Misericordiae Hospital",
].map((name, i) => ({
  id: `hospital-${i + 1}`,
  name,
  logoUrl: monogram(name, COLORS[i % COLORS.length]),
}));

export const INSURERS: Institution[] = [
  "SHA",
  "AAR Insurance",
  "CIC Insurance",
  "Jubilee Health Insurance",
  "Britam",
  "Madison Insurance",
].map((name, i) => ({
  id: `insurer-${i + 1}`,
  name,
  logoUrl: monogram(name, COLORS[i % COLORS.length]),
}));
