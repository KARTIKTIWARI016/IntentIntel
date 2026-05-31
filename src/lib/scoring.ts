import type { AppConfig } from "@/lib/config";
import type { ModelOutput, ModelSignal } from "@/lib/contract";
import { BUYING_STAGES } from "@/lib/contract";
import { clamp } from "@/lib/utils";

export interface ScoredSignal {
  category: string;
  strength: number;
  ageDays: number;
  decayedWeight: number; // final contribution to the score
  evidenceQuote: string;
  sourceUrl: string | null;
  sourceType: string | null;
  detectedDate: string | null;
}

export interface ScoreResult {
  intentScore: number; // 0-100
  confidence: number; // 0-100
  buyingStage: (typeof BUYING_STAGES)[number];
  signals: ScoredSignal[];
}

/** Exponential decay in [0,1]: 1.0 at age 0, 0.5 at one half-life, ~0 past the window. */
export function decayFactor(ageDays: number, halfLife: number, recencyDays: number): number {
  if (ageDays <= 0) return 1;
  if (ageDays > recencyDays) return 0; // outside the active window → no contribution
  const hl = Math.max(1, halfLife);
  return Math.pow(0.5, ageDays / hl);
}

/**
 * Hybrid scoring: Gemini supplies signals + evidence; transparent weighted rules
 * with age-decay produce the 0-100 intent score. Fully explainable per signal.
 */
export function scoreCompany(model: ModelOutput, config: AppConfig): ScoreResult {
  const scored: ScoredSignal[] = [];

  for (const s of model.signals) {
    const weight = config.signalWeights[s.category] ?? 0.5;
    const ageDays = clampAge(s.ageDays);
    const decay = decayFactor(ageDays, config.decayHalfLife, config.recencyDays);
    // Contribution: normalized strength (0-1) × category weight × decay, scaled to points.
    const contribution = (s.strength / 100) * weight * decay;
    scored.push({
      category: s.category,
      strength: s.strength,
      ageDays,
      decayedWeight: round2(contribution),
      evidenceQuote: s.evidenceQuote,
      sourceUrl: s.sourceUrl ?? null,
      sourceType: s.sourceType ?? null,
      detectedDate: s.detectedDate ?? null,
    });
  }

  // Aggregate with diminishing returns so one giant signal can't max the score alone,
  // but multiple corroborating signals push it higher.
  const totalContribution = scored.reduce((acc, s) => acc + s.decayedWeight, 0);
  // Map total contribution → 0-100 via a saturating curve (3.0 contribution ≈ ~95).
  const intentScore = clamp(Math.round(100 * (1 - Math.exp(-totalContribution / 1.2))));

  const confidence = computeConfidence(scored, intentScore);
  const buyingStage = mapStage(intentScore, scored, model);

  return { intentScore, confidence, buyingStage, signals: scored };
}

/** Confidence reflects evidence VOLUME, source DIVERSITY, and recency — not the score itself. */
function computeConfidence(signals: ScoredSignal[], intentScore: number): number {
  if (signals.length === 0) return intentScore === 0 ? 70 : 20; // confident "no intent" is fine
  const withUrl = signals.filter((s) => s.sourceUrl).length;
  const distinctCategories = new Set(signals.map((s) => s.category)).size;
  const distinctSourceTypes = new Set(signals.map((s) => s.sourceType).filter(Boolean)).size;
  const avgAge = signals.reduce((a, s) => a + s.ageDays, 0) / signals.length;

  let c = 30;
  c += Math.min(25, withUrl * 8); // cited evidence
  c += Math.min(20, distinctCategories * 7); // corroboration across signal types
  c += Math.min(15, distinctSourceTypes * 5); // source diversity
  c += avgAge <= 14 ? 10 : avgAge <= 30 ? 5 : 0; // freshness
  return clamp(Math.round(c));
}

/** Map score + signal mix to a buying stage. */
function mapStage(
  intentScore: number,
  signals: ScoredSignal[],
  model: ModelOutput,
): (typeof BUYING_STAGES)[number] {
  const hasProcurement = signals.some((s) => s.category === "procurement_rfp");
  const hasDisplacement = signals.some((s) => s.category === "competitor_displacement");

  if (intentScore >= 80 || hasProcurement) return "decision";
  if (intentScore >= 60 || (hasDisplacement && intentScore >= 45)) return "evaluating";
  if (intentScore >= 35 || model.inMarketForCrm) return "in_market";
  if (intentScore >= 15) return "aware";
  return "unaware";
}

function clampAge(age: number | null | undefined): number {
  if (age == null || !Number.isFinite(age) || age < 0) return 0;
  return Math.round(age);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Re-export for tests / debugging.
export type { ModelSignal };
