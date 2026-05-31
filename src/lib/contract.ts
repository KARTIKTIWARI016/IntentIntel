import { z } from "zod";

/** Signal categories the platform tracks (mirrors discovery decisions). */
export const SIGNAL_CATEGORIES = [
  "competitor_displacement",
  "hiring",
  "active_research",
  "procurement_rfp",
] as const;

export const SOURCE_TYPES = [
  "review_site",
  "job_board",
  "social_forum",
  "news_pr",
  "rfp",
  "other",
] as const;

export const BUYING_STAGES = [
  "unaware",
  "aware",
  "in_market",
  "evaluating",
  "decision",
] as const;

/** Single evidence-backed signal as returned by Gemini. */
export const ModelSignalSchema = z.object({
  category: z.enum(SIGNAL_CATEGORIES),
  strength: z.number().min(0).max(100),
  evidenceQuote: z.string().min(1),
  sourceUrl: z.string().nullable().optional(),
  sourceType: z.enum(SOURCE_TYPES).nullable().optional(),
  detectedDate: z.string().nullable().optional(),
  ageDays: z.number().min(0).nullable().optional(),
});
export type ModelSignal = z.infer<typeof ModelSignalSchema>;

/** Full structured contract Gemini must return (we extract JSON from grounded text). */
export const ModelOutputSchema = z.object({
  firmographics: z.object({
    industry: z.string().nullable().optional(),
    employeeCount: z.string().nullable().optional(),
    revenueEstimate: z.string().nullable().optional(),
    existingCrm: z.string().nullable().optional(),
    techStack: z.array(z.string()).default([]),
  }),
  signals: z.array(ModelSignalSchema).default([]),
  buyingStageRationale: z.string().default(""),
  summary: z.string().default(""),
  inMarketForCrm: z.boolean().default(false),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

export const GroundingSourceSchema = z.object({
  title: z.string().default(""),
  uri: z.string().default(""),
});
export type GroundingSource = z.infer<typeof GroundingSourceSchema>;

/** Shape returned to the UI for a completed report. */
export interface IntentReport {
  runId: string;
  company: {
    id: string;
    name: string;
    domain: string;
    url: string;
    industry: string | null;
    employeeCount: string | null;
    revenueEstimate: string | null;
    existingCrm: string | null;
    techStack: string[];
  };
  intentScore: number;
  confidence: number;
  buyingStage: (typeof BUYING_STAGES)[number];
  summary: string;
  signals: Array<{
    category: (typeof SIGNAL_CATEGORIES)[number];
    strength: number;
    ageDays: number;
    decayedWeight: number;
    evidenceQuote: string;
    sourceUrl: string | null;
    sourceType: string | null;
    detectedDate: string | null;
  }>;
  outreach: string | null;
  groundingSources: GroundingSource[];
  feedback: { verdict: string; note: string | null } | null;
  cached: boolean;
  createdAt: string;
  expiresAt: string;
}
