import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getConfig, type AppConfig } from "@/lib/config";
import { normalizeDomain, ensureUrl, safeJsonParse } from "@/lib/utils";
import type { GroundingSource } from "@/lib/contract";

export interface DossierResult {
  id: string;
  name: string;
  domain: string;
  url: string;
  model: string;
  markdown: string;
  sources: GroundingSource[];
  queries: string[];
  cached: boolean;
  createdAt: string;
  expiresAt: string;
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

export function buildDossierPrompt(config: AppConfig, name: string, url: string): string {
  const competitors = config.competitors.join(", ");
  return `You are a senior B2B sales-intelligence analyst, market researcher, SDR, ABM strategist, and marketing consultant working for a company that SELLS its own CRM product called "${config.ourCrmName}". Direct CRM competitors: ${competitors}.

Using Google Search, conduct DEEP, CURRENT research on the target company across: its own website, Google results, LinkedIn, news articles, funding databases (Crunchbase/PitchBook coverage), technology-stack signals (BuiltWith-style), job postings, social media, and review platforms (G2/Capterra/TrustRadius). Today's context is mid-2026.

TARGET COMPANY:
- Name: ${name}
- Website: ${url}

Produce a comprehensive account dossier as GitHub-flavored MARKDOWN. Use exactly these 9 top-level sections as "## " headings, in order:

## 1. Company Intelligence Report
Overview, business model, products & services, industry & market segment, revenue estimate, employee count, geographic presence, recent news & announcements (with dates), funding history, strategic priorities/initiatives, current technology stack & CRM tools in use, and hiring trends that reveal priorities.

## 2. Stakeholder Mapping
Identify likely decision-makers/influencers (CEO, Founder, CRO, VP Sales, VP Marketing, Head of Customer Success, RevOps, CRM admins, digital-transformation leaders). Present as a Markdown TABLE with columns: Name | Role | LinkedIn | Why relevant to ${config.ourCrmName} | Likely pain points. If you cannot verify a specific person, write the ROLE and put "(unverified)" in the Name cell rather than inventing a name. Start this section with this exact line in italics: *Personal data — verify every name and LinkedIn URL before any outreach; included per operator request. Subject to GDPR for EU/UK individuals.*

## 3. Competitive Landscape
CRM platforms they likely already use, alternative CRM vendors likely pitching them, direct competitors targeting this account, recent CRM migrations at similar companies, and exploitable weaknesses in competitor positioning.

## 4. Sales Opportunity Analysis
Why they may need a CRM now, buying signals, trigger events, growth indicators, likely sales-cycle challenges, an estimated deal size (with reasoning), and a probability of conversion (Low/Medium/High + rough %).

## 5. Account-Based Marketing (ABM) Strategy
Target personas, messaging themes, pain-point-based positioning, content recommendations, campaign ideas, retargeting strategy, webinar/event opportunities, and partnership opportunities.

## 6. Multi-Channel Outreach Strategy
### Cold Email Sequence — a 5-email sequence; for each: subject line, body with a personalization snippet, an objection it preempts, and a CTA; plus the follow-up cadence (days between).
### LinkedIn Strategy — connection request message, first-touch message, a follow-up sequence, a value-based engagement plan, and content topics.
### Call Strategy — discovery-call opener, qualification questions, objection-handling scripts, and a meeting-booking script.

## 7. Content & Marketing Recommendations
Blog topics, whitepaper ideas, case-study recommendations, industry insights to share, and executive-level thought-leadership angles — all specific to this account.

## 8. Competitive Battlecard
For each major competitor relevant to this account, a sub-section with: strengths, weaknesses, common customer complaints, positioning strategy, and counter-messaging.

## 9. Executive Summary
Top 5 insights, the biggest opportunity, the biggest risk, the recommended next action, and a 30-day engagement plan.

RULES:
- Be SPECIFIC to THIS company — its industry, growth stage, tech stack, current initiatives, and competitive environment. No generic filler.
- Use current, web-grounded facts. For every critical/non-obvious finding (funding, revenue, news, tech stack, named people), cite the source inline as a Markdown link [source](url).
- If a fact cannot be found, say "Not found in public sources" rather than guessing.
- End with a "## Sources" section listing the key URLs you relied on.
- Output ONLY the Markdown report (no preamble, no code fences around the whole thing).`;
}

function extractGrounding(candidate: unknown): { sources: GroundingSource[]; queries: string[] } {
  const meta = (candidate as {
    groundingMetadata?: { groundingChunks?: unknown[]; webSearchQueries?: string[] };
  })?.groundingMetadata;
  const chunks = meta?.groundingChunks ?? [];
  const sources: GroundingSource[] = [];
  for (const c of chunks) {
    const web = (c as { web?: { uri?: string; title?: string } })?.web;
    if (web?.uri) sources.push({ title: web.title ?? web.uri, uri: web.uri });
  }
  const seen = new Set<string>();
  const deduped = sources.filter((s) => (seen.has(s.uri) ? false : (seen.add(s.uri), true)));
  return { sources: deduped, queries: meta?.webSearchQueries ?? [] };
}

function toResult(
  row: {
    id: string;
    name: string;
    domain: string;
    model: string;
    markdown: string;
    sources: string | null;
    queries: string | null;
    createdAt: Date;
    expiresAt: Date;
  },
  url: string,
  cached: boolean,
): DossierResult {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    url,
    model: row.model,
    markdown: row.markdown,
    sources: safeJsonParse<GroundingSource[]>(row.sources, []),
    queries: safeJsonParse<string[]>(row.queries, []),
    cached,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function getCachedDossier(domain: string): Promise<DossierResult | null> {
  const row = await prisma.dossier.findFirst({
    where: { domain, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return row ? toResult(row, ensureUrl(domain), true) : null;
}

export interface DossierOptions {
  forceRefresh?: boolean;
}

export async function generateDossier(
  name: string,
  url: string,
  opts: DossierOptions = {},
): Promise<DossierResult> {
  const domain = normalizeDomain(url || name);
  if (!domain) throw new Error("Could not derive a domain from the provided input.");

  if (!opts.forceRefresh) {
    const cached = await getCachedDossier(domain);
    if (cached) return cached;
  }

  const config = await getConfig();
  const cleanUrl = ensureUrl(url || domain);
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: buildDossierPrompt(config, name, cleanUrl),
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.4,
      maxOutputTokens: 32768,
    },
  });

  const markdown = (response.text ?? "").trim();
  if (!markdown) throw new Error("Empty dossier response from the model.");

  const { sources, queries } = extractGrounding(response.candidates?.[0]);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.recencyDays * 24 * 60 * 60 * 1000);

  // Link to a known company if one exists (best-effort).
  const company = await prisma.company.findUnique({ where: { domain } });

  const row = await prisma.dossier.create({
    data: {
      companyId: company?.id ?? null,
      domain,
      name,
      model: config.geminiModel,
      markdown,
      sources: JSON.stringify(sources),
      queries: JSON.stringify(queries),
      expiresAt,
    },
  });

  return toResult(row, cleanUrl, false);
}
