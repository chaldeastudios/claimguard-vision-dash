import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOpenimisHealthFacilities } from "./healthfacility.server";
import { searchOpenimisInsureesByChfId, searchOpenimisInsureesByName } from "./insuree.server";
import { createOpenimisClaim } from "./openimis.server";
import type { HealthFacility } from "./healthfacility.server";
import type { Insuree } from "./insuree.server";

// Everything in this file is deliberately unauthenticated -- it backs the
// public hospital claim submission portal, which hospital staff use without
// a ClaimGuard reviewer account. Patient lookup is exact/prefix search only
// (by CHF ID or name), not a browsable roster, to avoid shipping the full
// insuree list's names/DOB/phone/email to an anonymous client.

export const fetchPublicHealthFacilities = createServerFn({ method: "GET" }).handler(
  async (): Promise<HealthFacility[]> => getOpenimisHealthFacilities(),
);

const SearchInsureeInput = z.object({ chfId: z.string().min(1) });

export const searchPublicInsurees = createServerFn({ method: "GET" })
  .inputValidator((data) => SearchInsureeInput.parse(data))
  .handler(async ({ data }): Promise<Insuree[]> => searchOpenimisInsureesByChfId(data.chfId));

const SearchInsureeByNameInput = z.object({ name: z.string().min(1) });

export const searchPublicInsureesByName = createServerFn({ method: "GET" })
  .inputValidator((data) => SearchInsureeByNameInput.parse(data))
  .handler(async ({ data }): Promise<Insuree[]> => searchOpenimisInsureesByName(data.name));

const SubmitClaimLineInput = z.object({
  globalId: z.string().min(1),
  quantity: z.number().positive(),
  priceAsked: z.number().positive(),
});

const SubmitClaimInput = z.object({
  insureeGlobalId: z.string().min(1),
  healthFacilityGlobalId: z.string().min(1),
  icdGlobalId: z.string().min(1),
  dateFrom: z.string().min(1),
  dateClaimed: z.string().min(1),
  visitType: z.string().nullable(),
  explanation: z.string().nullable(),
  items: z.array(SubmitClaimLineInput),
  services: z.array(SubmitClaimLineInput),
});

export const submitHospitalClaim = createServerFn({ method: "POST" })
  .inputValidator((data) => SubmitClaimInput.parse(data))
  .handler(async ({ data }): Promise<{ code: string }> => createOpenimisClaim(data));
