import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getOpenimisPolicy,
  getOpenimisPoliciesByFamily,
  getOpenimisPremiumsByPolicy,
  createOpenimisPremium,
  updateOpenimisPremium,
  type Policy,
  type Premium,
} from "./policy.server";

export type { Policy, Premium };

const PolicyIdInput = z.object({ policyId: z.string().min(1) });

export const fetchPolicy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PolicyIdInput.parse(data))
  .handler(async ({ data }): Promise<Policy | null> => getOpenimisPolicy(data.policyId));

const FamilyIdInput = z.object({ familyId: z.string().min(1) });

export const fetchPoliciesByFamily = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => FamilyIdInput.parse(data))
  .handler(async ({ data }): Promise<Policy[]> => getOpenimisPoliciesByFamily(data.familyId));

export const fetchPremiumsByPolicy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PolicyIdInput.parse(data))
  .handler(async ({ data }): Promise<Premium[]> => getOpenimisPremiumsByPolicy(data.policyId));

const CreatePremiumInput = z.object({
  policyUuid: z.string().min(1),
  amount: z.number().positive(),
  receipt: z.string().nullable(),
  payDate: z.string().nullable(),
  payType: z.string().nullable(),
});

export const createPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreatePremiumInput.parse(data))
  .handler(async ({ data }): Promise<void> => createOpenimisPremium(data));

const UpdatePremiumInput = CreatePremiumInput.extend({ uuid: z.string().min(1) });

export const updatePremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => UpdatePremiumInput.parse(data))
  .handler(async ({ data }): Promise<void> => updateOpenimisPremium(data));
