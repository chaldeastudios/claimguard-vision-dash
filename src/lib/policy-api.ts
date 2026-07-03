import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getOpenimisPolicy,
  getOpenimisPoliciesByFamily,
  getOpenimisPremiumsByPolicy,
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
