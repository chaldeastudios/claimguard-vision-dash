import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getOpenimisHealthFacilities,
  getOpenimisHealthFacility,
  type HealthFacility,
} from "./healthfacility.server";

export type { HealthFacility };

export const fetchHealthFacilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<HealthFacility[]> => getOpenimisHealthFacilities());

const HealthFacilityIdInput = z.object({ facilityId: z.string().min(1) });

export const fetchHealthFacility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => HealthFacilityIdInput.parse(data))
  .handler(
    async ({ data }): Promise<HealthFacility | null> => getOpenimisHealthFacility(data.facilityId),
  );
