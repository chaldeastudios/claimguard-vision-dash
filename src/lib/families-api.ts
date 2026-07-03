import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getOpenimisFamilies,
  getOpenimisFamily,
  getOpenimisFamilyMembers,
  getOpenimisInsuree,
  updateOpenimisInsuree,
  type Family,
  type Insuree,
} from "./insuree.server";

export type { Family, Insuree };

export const fetchFamilies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<Family[]> => getOpenimisFamilies());

const FamilyIdInput = z.object({ familyId: z.string().min(1) });

export const fetchFamily = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => FamilyIdInput.parse(data))
  .handler(async ({ data }): Promise<Family | null> => getOpenimisFamily(data.familyId));

export const fetchFamilyMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => FamilyIdInput.parse(data))
  .handler(async ({ data }): Promise<Insuree[]> => getOpenimisFamilyMembers(data.familyId));

const InsureeIdInput = z.object({ insureeId: z.string().min(1) });

export const fetchInsuree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InsureeIdInput.parse(data))
  .handler(async ({ data }): Promise<Insuree | null> => getOpenimisInsuree(data.insureeId));

const UpdateInsureeInput = z.object({
  uuid: z.string().min(1),
  chfId: z.string().min(1),
  lastName: z.string().min(1),
  otherNames: z.string().min(1),
  gender: z.enum(["M", "F"]),
  dob: z.string().min(1),
  head: z.boolean(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  currentAddress: z.string().nullable(),
});

export const updateInsuree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => UpdateInsureeInput.parse(data))
  .handler(async ({ data }): Promise<void> => updateOpenimisInsuree(data));
