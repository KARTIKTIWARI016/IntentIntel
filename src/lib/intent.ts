import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { analyzeCompanyWithGemini } from "@/lib/gemini";
import { scoreCompany } from "@/lib/scoring";
import { draftOutreach } from "@/lib/outreach";
import { normalizeDomain, ensureUrl, safeJsonParse } from "@/lib/utils";
import type { IntentReport, GroundingSource, BUYING_STAGES } from "@/lib/contract";

type RunWithRelations = NonNullable<Awaited<ReturnType<typeof findRunWithRelations>>>;

function findRunWithRelations(runId: string) {
  return prisma.analysisRun.findUnique({
    where: { id: runId },
    include: { company: true, signals: true, outreach: true, feedback: true },
  });
}

/** Convert a persisted run (+relations) into the UI report shape. */
export function toReport(run: RunWithRelations, cached: boolean): IntentReport {
  return {
    runId: run.id,
    company: {
      id: run.company.id,
      name: run.company.name,
      domain: run.company.domain,
      url: run.company.url,
      industry: run.company.industry,
      employeeCount: run.company.employeeCount,
      revenueEstimate: run.company.revenueEstimate,
      existingCrm: run.company.existingCrm,
      techStack: safeJsonParse<string[]>(run.company.techStack, []),
    },
    intentScore: run.intentScore,
    confidence: run.confidence,
    buyingStage: run.buyingStage as (typeof BUYING_STAGES)[number],
    summary: run.summary ?? "",
    signals: run.signals.map((s) => ({
      category: s.category as IntentReport["signals"][number]["category"],
      strength: s.strength,
      ageDays: s.ageDays,
      decayedWeight: s.decayedWeight,
      evidenceQuote: s.evidenceQuote,
      sourceUrl: s.sourceUrl,
      sourceType: s.sourceType,
      detectedDate: s.detectedDate,
    })),
    outreach: run.outreach?.message ?? null,
    groundingSources: safeJsonParse<GroundingSource[]>(run.groundingSources, []),
    feedback: run.feedback ? { verdict: run.feedback.verdict, note: run.feedback.note } : null,
    cached,
    createdAt: run.createdAt.toISOString(),
    expiresAt: run.expiresAt.toISOString(),
  };
}

/** Return a fresh (non-expired) cached report for a domain, or null. */
export async function getCachedReport(domain: string): Promise<IntentReport | null> {
  const company = await prisma.company.findUnique({ where: { domain } });
  if (!company) return null;
  const run = await prisma.analysisRun.findFirst({
    where: { companyId: company.id, status: "complete", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    include: { company: true, signals: true, outreach: true, feedback: true },
  });
  return run ? toReport(run, true) : null;
}

export interface AnalyzeOptions {
  forceRefresh?: boolean;
}

/**
 * Full analysis: cache check → grounded Gemini call → hybrid score → persist.
 * Throws on API/validation failure so the queue worker can retry.
 */
export async function analyzeCompany(
  name: string,
  url: string,
  opts: AnalyzeOptions = {},
): Promise<IntentReport> {
  const domain = normalizeDomain(url || name);
  if (!domain) throw new Error("Could not derive a domain from the provided input.");

  if (!opts.forceRefresh) {
    const cached = await getCachedReport(domain);
    if (cached) return cached;
  }

  const config = await getConfig();
  const cleanUrl = ensureUrl(url || domain);
  const { output, sources, raw } = await analyzeCompanyWithGemini(config, name, cleanUrl);
  const scored = scoreCompany(output, config);
  const outreach = draftOutreach(name, scored.signals, config);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.recencyDays * 24 * 60 * 60 * 1000);

  // Upsert company with latest firmographics.
  const company = await prisma.company.upsert({
    where: { domain },
    create: {
      name,
      domain,
      url: cleanUrl,
      industry: output.firmographics.industry ?? null,
      employeeCount: output.firmographics.employeeCount ?? null,
      revenueEstimate: output.firmographics.revenueEstimate ?? null,
      existingCrm: output.firmographics.existingCrm ?? null,
      techStack: JSON.stringify(output.firmographics.techStack ?? []),
      lastAnalyzedAt: now,
    },
    update: {
      name,
      url: cleanUrl,
      industry: output.firmographics.industry ?? null,
      employeeCount: output.firmographics.employeeCount ?? null,
      revenueEstimate: output.firmographics.revenueEstimate ?? null,
      existingCrm: output.firmographics.existingCrm ?? null,
      techStack: JSON.stringify(output.firmographics.techStack ?? []),
      lastAnalyzedAt: now,
    },
  });

  const run = await prisma.analysisRun.create({
    data: {
      companyId: company.id,
      status: "complete",
      intentScore: scored.intentScore,
      confidence: scored.confidence,
      buyingStage: scored.buyingStage,
      summary:
        output.summary && output.buyingStageRationale
          ? `${output.summary}\n\nRationale: ${output.buyingStageRationale}`
          : output.summary || output.buyingStageRationale,
      rawModelOutput: raw,
      groundingSources: JSON.stringify(sources),
      expiresAt,
      signals: {
        create: scored.signals.map((s) => ({
          category: s.category,
          strength: s.strength,
          ageDays: s.ageDays,
          decayedWeight: s.decayedWeight,
          evidenceQuote: s.evidenceQuote,
          sourceUrl: s.sourceUrl,
          sourceType: s.sourceType,
          detectedDate: s.detectedDate,
        })),
      },
      outreach: { create: { message: outreach } },
    },
    include: { company: true, signals: true, outreach: true, feedback: true },
  });

  return toReport(run, false);
}

export { findRunWithRelations };
