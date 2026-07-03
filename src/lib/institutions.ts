// Placeholder demo institutions for the white-label branding switcher. All
// three read/write the same single openIMIS backend (see
// src/lib/openimis.server.ts) -- "institution" is purely a presentation-layer
// concept for this demo, not a separate backend/tenant. Real product name and
// real institution list are still TBD; these are stand-ins.

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  colors: {
    brown: string;
    brownForeground: string;
    orange: string;
  };
}

export const institutions: Institution[] = [
  {
    id: "demo-a",
    name: "Demo Health Scheme A",
    shortName: "Scheme A",
    initials: "A",
    colors: {
      brown: "oklch(0.52 0.045 45)",
      brownForeground: "oklch(0.99 0.005 90)",
      orange: "oklch(0.68 0.21 38)",
    },
  },
  {
    id: "demo-b",
    name: "Demo Health Scheme B",
    shortName: "Scheme B",
    initials: "B",
    colors: {
      brown: "oklch(0.50 0.05 210)",
      brownForeground: "oklch(0.99 0.005 90)",
      orange: "oklch(0.65 0.16 195)",
    },
  },
  {
    id: "demo-c",
    name: "Demo Health Scheme C",
    shortName: "Scheme C",
    initials: "C",
    colors: {
      brown: "oklch(0.50 0.06 320)",
      brownForeground: "oklch(0.99 0.005 90)",
      orange: "oklch(0.66 0.19 305)",
    },
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
  document.documentElement.dataset.institution = id;
}
