import { createServerFn } from "@tanstack/react-start";
import {
  getOpenimisDiagnoses,
  getOpenimisMedicalItems,
  getOpenimisMedicalServices,
  type CatalogEntry,
} from "./claim-catalog.server";

export type { CatalogEntry };

// Deliberately no auth middleware -- this backs the public hospital claim
// submission portal (dashboard.hospital-portal.tsx), which hospital staff
// use without a ClaimGuard reviewer account.
export const fetchDiagnoses = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogEntry[]> => getOpenimisDiagnoses(),
);

export const fetchMedicalItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogEntry[]> => getOpenimisMedicalItems(),
);

export const fetchMedicalServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogEntry[]> => getOpenimisMedicalServices(),
);
