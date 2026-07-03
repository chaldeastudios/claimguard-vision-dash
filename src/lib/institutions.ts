// Placeholder demo institutions for the white-label switcher. All three
// read/write the same single openIMIS backend (see src/lib/openimis.server.ts)
// -- "institution" is purely a presentation-layer concept for this demo, not
// a separate backend/tenant. Switching institution swaps the logo shown in
// the dashboard header/sidebar only -- the rest of the brand (colors,
// typography) stays the single locked-in ClaimGuard identity, it does not
// change per institution. Real product name and real institution list are
// still TBD; these are stand-ins.

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  // The insurer's own company logo, shown in place of the ClaimGuard
  // wordmark once set. Null falls back to an initials badge in the
  // ClaimGuard brand color -- there's no real uploaded asset yet for any
  // of these demo institutions.
  logoUrl: string | null;
}

export const institutions: Institution[] = [
  {
    id: "demo-a",
    name: "Demo Health Scheme A",
    shortName: "Scheme A",
    initials: "A",
    logoUrl: null,
  },
  {
    id: "demo-b",
    name: "Demo Health Scheme B",
    shortName: "Scheme B",
    initials: "B",
    logoUrl: null,
  },
  {
    id: "demo-c",
    name: "Demo Health Scheme C",
    shortName: "Scheme C",
    initials: "C",
    logoUrl: null,
  },
];

export const defaultInstitution = institutions[0];

const STORAGE_KEY = "institution-id";

export function getStoredInstitutionId(): string {
  if (typeof window === "undefined") return defaultInstitution.id;
  return window.localStorage.getItem(STORAGE_KEY) || defaultInstitution.id;
}

export function getInstitution(id: string): Institution {
  return institutions.find((i) => i.id === id) ?? defaultInstitution;
}

export function setInstitution(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}
