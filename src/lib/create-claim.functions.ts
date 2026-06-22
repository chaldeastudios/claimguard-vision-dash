import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  patient: z.string().min(1),
  patientId: z.string().min(1),
  facility: z.string().min(1),
  diagnosisCode: z.string().min(1),
  diagnosis: z.string().min(1),
  services: z.array(z.string()).min(1),
  amount: z.number().int().positive(),
  submittedAt: z.string().min(1),
});

function randomId(): string {
  const n = Math.floor(Math.random() * 90000 + 10000);
  return `CLM-${new Date().getFullYear()}-${n}`;
}

export const createClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const id = randomId();
    const { data: row, error } = await context.supabase
      .from("claims")
      .insert({
        id,
        patient: data.patient,
        patient_id: data.patientId,
        facility: data.facility,
        diagnosis_code: data.diagnosisCode,
        diagnosis: data.diagnosis,
        services: data.services,
        amount: data.amount,
        submitted_at: data.submittedAt,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });
