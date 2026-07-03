import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getOpenimisFamilies,
  getOpenimisFamily,
  getOpenimisFamilyMembers,
  getOpenimisInsuree,
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
