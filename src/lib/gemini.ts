import { GoogleGenAI } from "@google/genai";
import type { AppConfig } from "@/lib/config";
import {
  ModelOutputSchema,
  type ModelOutput,
  type GroundingSource,
} from "@/lib/contract";

export interface GeminiResult {
  output: ModelOutput;
  sources: GroundingSource[];
  raw: string;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env (get a free key at https://aistudio.google.com/apikey).",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** Build the grounded research prompt scoped to the discovery decisions. */
export function buildPrompt(
  config: AppConfig,
  name: string,
  url: string,
): string {
  const competitors = config.competitors.join(", ");
  return `You are a B2B intent-research analyst for a company that SELLS its own CRM product called "${config.ourCrmName}".
Direct CRM competitors include: ${competitors}.

INTENT DEFINITION: ${config.intentDef}

TASK: Using Google Search, research the company below and determine whether it is currently showing buying intent for a CRM solution. ONLY count public evidence from the LAST ${config.recencyDays} DAYS. Ignore anything older for scoring, but you may use older public sources only for stable firmographic context.

COMPANY:
- Name: ${name}
- Website: ${url}

Look specifically for these four signal categories:
1. competitor_displacement — searches/discussions about "${competitors.split(",")[0]?.trim()} alternatives", complaints about a current CRM, stated plans to switch/migrate CRMs.
2. hiring — job postings for CRM administrators, RevOps, or roles mentioning CRM migration/implementation.
3. active_research — reviews on G2/Capterra/TrustRadius, comparison threads on Reddit/Quora, "best CRM for X" discussions involving this company.
4. procurement_rfp — public RFPs, procurement notices, or CRM consulting engagements.

Prefer these source types: review_site, job_board, social_forum, news_pr, rfp.

RESEARCH DEPTH:
- Run a broad account-intelligence pass before scoring: company website, news, press releases, careers/jobs, review sites, public forums, CRM/vendor comparison pages, procurement/RFP mentions, and technology-stack mentions surfaced by Search.
- Return up to 8 high-quality signals when available, prioritizing the strongest and most recent evidence. Include weak/negative findings only if they explain why intent is low.
- Capture concrete details a sales rep can use: trigger event, inferred pain, current/likely CRM, affected team, buying stage rationale, likely urgency, and why the evidence matters.
- If evidence is thin, say exactly what was checked and what was not found in the summary. Do not hide uncertainty.

OUTPUT RULES:
- Respond with a SINGLE valid JSON object and NOTHING else (no markdown, no commentary).
- For every signal include a short verbatim evidenceQuote and the exact sourceUrl you found it at.
- Evidence quotes should be specific enough to be useful, not generic company boilerplate.
- "strength" is 0-100 (how strong/explicit the buying intent is).
- "ageDays" is your best estimate of how many days ago the signal is from (0 if today, omit if unknown).
- If you find NO qualifying recent signals, return an empty "signals" array and inMarketForCrm=false. Do NOT fabricate evidence.
- "buyingStageRationale" is a detailed 4-7 sentence explanation of why this company is or is not in a CRM buying cycle.
- "summary" is a useful 4-6 sentence sales-rep brief covering the account context, strongest evidence, confidence caveats, and recommended next step.

JSON SHAPE:
{
  "firmographics": {
    "industry": string|null,
    "employeeCount": string|null,
    "revenueEstimate": string|null,
    "existingCrm": string|null,
    "techStack": string[]
  },
  "signals": [
    {
      "category": "competitor_displacement|hiring|active_research|procurement_rfp",
      "strength": number,
      "evidenceQuote": string,
      "sourceUrl": string|null,
      "sourceType": "review_site|job_board|social_forum|news_pr|rfp|other"|null,
      "detectedDate": string|null,
      "ageDays": number|null
    }
  ],
  "buyingStageRationale": string,
  "summary": string,
  "inMarketForCrm": boolean
}`;
}

/** Strip markdown fences / surrounding prose and pull the first JSON object. */
function extractJson(text: string): string {
  let t = text.trim();
  // Remove ```json ... ``` fences if present.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }
  return t.slice(start, end + 1);
}

function extractSources(candidate: unknown): GroundingSource[] {
  const meta = (candidate as { groundingMetadata?: { groundingChunks?: unknown[] } })
    ?.groundingMetadata;
  const chunks = meta?.groundingChunks ?? [];
  const out: GroundingSource[] = [];
  for (const c of chunks) {
    const web = (c as { web?: { uri?: string; title?: string } })?.web;
    if (web?.uri) out.push({ title: web.title ?? web.uri, uri: web.uri });
  }
  // Dedupe by uri.
  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.uri) ? false : (seen.add(s.uri), true)));
}

/** Run one grounded analysis. Throws on API/parse failure (caller handles retry). */
export async function analyzeCompanyWithGemini(
  config: AppConfig,
  name: string,
  url: string,
): Promise<GeminiResult> {
  const ai = getClient();
  const prompt = buildPrompt(config, name, url);

  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const raw = response.text ?? "";
  if (!raw) throw new Error("Empty response from Gemini.");

  const parsed = ModelOutputSchema.safeParse(JSON.parse(extractJson(raw)));
  if (!parsed.success) {
    throw new Error(
      "Model output failed validation: " + parsed.error.issues.map((i) => i.message).join("; "),
    );
  }

  const candidate = response.candidates?.[0];
  return { output: parsed.data, sources: extractSources(candidate), raw };
}
