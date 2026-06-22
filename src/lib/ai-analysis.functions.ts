import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ claimId: z.string().min(1) });

const SYSTEM_PROMPT = `You are ClaimGuard, a fraud-detection analyst for a national health insurance scheme.
Given a single insurance claim, identify whether it shows signs of fraud, abuse, or billing irregularities.
Be specific: cite the diagnosis code, services, amount, facility, and patient pattern when relevant.
Respond ONLY with a single JSON object, no markdown, matching this schema:
{
  "risk_score": <integer 0-100>,
  "risk_level": "High" | "Medium" | "Low",
  "summary": <one short paragraph, 1-2 sentences>,
  "reasons": [ { "title": <short label>, "detail": <one sentence explanation> }, ... 2 to 5 items ],
  "recommendation": "approve" | "investigate" | "reject"
}`;

export const analyzeClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data, context }) => {
    // AI provider resolution. Prefer a direct Google Gemini key (billed by
    // Google at list price, no gateway markup); fall back to the Lovable AI
    // gateway when only that is configured (e.g. inside the Lovable preview).
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const provider = geminiKey
      ? {
          // Google's OpenAI-compatible endpoint — same request/response shape.
          endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          apiKey: geminiKey,
          model: "gemini-2.5-flash",
        }
      : lovableKey
        ? {
            endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
            apiKey: lovableKey,
            model: "google/gemini-2.5-flash",
          }
        : null;
    if (!provider) {
      throw new Error(
        "No AI provider configured. Set GEMINI_API_KEY (direct Google Gemini, recommended) or LOVABLE_API_KEY.",
      );
    }

    const { data: claim, error: claimErr } = await context.supabase
      .from("claims")
      .select("*")
      .eq("id", data.claimId)
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claim) throw new Error("Claim not found");

    const userPrompt = `Claim ID: ${claim.id}
Patient: ${claim.patient} (${claim.patient_id})
Facility: ${claim.facility}
Diagnosis: ${claim.diagnosis_code} — ${claim.diagnosis}
Services billed: ${(claim.services ?? []).join(", ")}
Amount billed: KES ${claim.amount.toLocaleString("en-KE")}
Submitted: ${claim.submitted_at}

Analyze this claim for fraud, abuse, or billing irregularities.`;

    const model = provider.model;
    const aiRes = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${txt.slice(0, 300)}`);
    }
    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: {
      risk_score: number;
      risk_level: "High" | "Medium" | "Low";
      summary: string;
      reasons: Array<{ title: string; detail: string }>;
      recommendation: string;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned non-JSON content");
    }

    const Validate = z.object({
      risk_score: z.number().int().min(0).max(100),
      risk_level: z.enum(["High", "Medium", "Low"]),
      summary: z.string().min(1),
      reasons: z
        .array(z.object({ title: z.string(), detail: z.string() }))
        .min(1)
        .max(8),
      recommendation: z.string().min(1),
    });
    const safe = Validate.parse(parsed);

    const { data: inserted, error: insertErr } = await context.supabase
      .from("claim_risk_analysis")
      .insert({
        claim_id: claim.id,
        model,
        summary: safe.summary,
        risk_score: safe.risk_score,
        risk_level: safe.risk_level,
        reasons: safe.reasons,
        recommendation: safe.recommendation,
        raw: aiJson,
        created_by: context.userId,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    return inserted;
  });
