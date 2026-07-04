import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "@/lib/session-middleware";
import { getOpenimisClaim } from "@/lib/openimis.server";
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

// Google's OpenAI-compatible endpoint — same request/response shape.
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// Tried in order until one succeeds -- a single model name can be
// temporarily overloaded, rate-limited, or renamed/retired without
// warning, and this is a demo where "AI analysis failed" outright is worse
// than falling back to a slightly different model. Fastest/cheapest first.
const MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

const AnalysisSchema = z.object({
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(["High", "Medium", "Low"]),
  summary: z.string().min(1),
  reasons: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .min(1)
    .max(8),
  recommendation: z.string().min(1),
});

async function callModel(model: string, apiKey: string, userPrompt: string) {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${model}: HTTP ${res.status} ${txt.slice(0, 300)}`);
  }
  const aiJson = await res.json();
  const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`${model}: returned non-JSON content`);
  }
  const result = AnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${model}: response didn't match the expected shape (${result.error.message})`);
  }
  return { aiJson, safe: result.data };
}

export const analyzeClaim = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error("No AI provider configured. Set GEMINI_API_KEY.");
    }

    const claim = await getOpenimisClaim(data.claimId);
    if (!claim) throw new Error("Claim not found");

    const lineItemsText = claim.lineItems.length
      ? claim.lineItems
          .map(
            (li) =>
              `- [${li.kind}] ${li.code} ${li.name}: qty ${li.quantityProvided ?? "?"}, asked KES ${li.priceAsked ?? "?"}, approved KES ${li.priceApproved ?? "not yet approved"}`,
          )
          .join("\n")
      : "not recorded";
    const otherDiagnosesText = claim.otherDiagnoses.length
      ? claim.otherDiagnoses.map((d) => `${d.code} — ${d.name}`).join(", ")
      : "none";

    const userPrompt = `Claim ID: ${claim.code}
Patient: ${claim.patient} (${claim.patientId})
Facility: ${claim.facility}
Visit type: ${claim.visitType ?? "not recorded"}
Primary diagnosis: ${claim.diagnosisCode} — ${claim.diagnosis}
Secondary diagnoses: ${otherDiagnosesText}
Items/services billed:
${lineItemsText}
Amount claimed: KES ${claim.amount.toLocaleString("en-KE")}
Amount approved: ${claim.approved != null ? `KES ${claim.approved.toLocaleString("en-KE")}` : "not yet approved"}
Amount valuated: ${claim.valuated != null ? `KES ${claim.valuated.toLocaleString("en-KE")}` : "not yet valuated"}
Date of service: ${claim.dateFrom ?? "unknown"} to ${claim.dateTo ?? "unknown"}
Submitted: ${claim.submittedAt}

Analyze this claim for fraud, abuse, or billing irregularities.`;

    let result: Awaited<ReturnType<typeof callModel>> | null = null;
    let usedModel: string | null = null;
    const attemptErrors: string[] = [];
    for (const model of MODEL_FALLBACKS) {
      try {
        result = await callModel(model, geminiKey, userPrompt);
        usedModel = model;
        break;
      } catch (err) {
        attemptErrors.push(err instanceof Error ? err.message : String(err));
        console.error(`[ai-analysis] ${model} failed, trying next fallback`, err);
      }
    }
    if (!result || !usedModel) {
      throw new Error(`All AI models failed: ${attemptErrors.join(" | ")}`);
    }
    const { aiJson, safe } = result;
    const model = usedModel;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("claim_risk_analysis")
      .insert({
        claim_id: claim.id, // openIMIS claim uuid -- matches what the backend fraud module syncs
        model,
        summary: safe.summary,
        risk_score: safe.risk_score,
        risk_level: safe.risk_level,
        reasons: safe.reasons,
        recommendation: safe.recommendation,
        raw: aiJson,
        created_by: context.session.openimisUsername,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    return inserted;
  });
