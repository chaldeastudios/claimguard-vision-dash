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
    //
    // Each provider ships an ordered list of candidate models. We try them in
    // turn so a single model being overloaded (HTTP 503 "high demand", 429,
    // or any transient 5xx) does not leave the whole analysis in a failed
    // state — we just move on to the next model and keep going.
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const provider = geminiKey
      ? {
          // Google's OpenAI-compatible endpoint — same request/response shape.
          endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          apiKey: geminiKey,
          models: [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
          ],
        }
      : lovableKey
        ? {
            endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
            apiKey: lovableKey,
            models: [
              "google/gemini-2.5-flash",
              "google/gemini-2.5-pro",
              "google/gemini-2.5-flash-lite",
              "openai/gpt-5-mini",
              "openai/gpt-5",
            ],
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

    // Try each candidate model in order. If one is overloaded or otherwise
    // fails, fall through to the next instead of surfacing a failed state to
    // the user. Only when *every* model has been exhausted do we throw.
    let model = "";
    let aiJson: unknown = null;
    let safe: z.infer<typeof Validate> | null = null;
    const attemptErrors: string[] = [];

    for (const candidate of provider.models) {
      try {
        const aiRes = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: candidate,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!aiRes.ok) {
          const txt = await aiRes.text();
          // 429 (rate limit) and 5xx (e.g. 503 high demand) are transient —
          // another model may succeed, so keep looping.
          throw new Error(`AI gateway ${aiRes.status}: ${txt.slice(0, 300)}`);
        }

        const json = await aiRes.json();
        const content: string = json?.choices?.[0]?.message?.content ?? "";
        const parsed = JSON.parse(content);
        const validated = Validate.parse(parsed);

        // Success — capture and stop trying further models.
        model = candidate;
        aiJson = json;
        safe = validated;
        break;
      } catch (err) {
        attemptErrors.push(`${candidate}: ${err instanceof Error ? err.message : String(err)}`);
        // Continue to the next candidate model.
      }
    }

    if (!safe) {
      throw new Error(
        `AI analysis failed across all models. Attempts:\n${attemptErrors.join("\n")}`,
      );
    }

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
