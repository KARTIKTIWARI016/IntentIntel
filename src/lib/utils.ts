import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize a company URL/domain to a bare host (lowercase, no www/path). */
export function normalizeDomain(input: string): string {
  let s = (input || "").trim().toLowerCase();
  if (!s) return "";
  if (!/^https?:\/\//.test(s)) s = "https://" + s;
  try {
    const host = new URL(s).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, "").split("/")[0];
  }
}

/** Ensure a URL has a scheme for display/linking. */
export function ensureUrl(input: string): string {
  const s = (input || "").trim();
  if (!s) return "";
  return /^https?:\/\//.test(s) ? s : "https://" + s;
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

const STAGE_LABELS: Record<string, string> = {
  unaware: "Unaware",
  aware: "Aware",
  in_market: "In-Market",
  evaluating: "Evaluating",
  decision: "Decision",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

const CATEGORY_LABELS: Record<string, string> = {
  competitor_displacement: "Competitor Displacement",
  hiring: "Hiring",
  active_research: "Active Research",
  procurement_rfp: "Procurement / RFP",
};

export function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
