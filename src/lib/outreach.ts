import type { AppConfig } from "@/lib/config";
import type { ScoredSignal } from "@/lib/scoring";
import { categoryLabel } from "@/lib/utils";

/**
 * Build a personalized outreach draft from the strongest detected signals.
 * Template-based (no extra API call) to stay within the free tier; the evidence
 * makes it specific enough to feel hand-written.
 */
export function draftOutreach(
  companyName: string,
  signals: ScoredSignal[],
  config: AppConfig,
): string {
  if (signals.length === 0) {
    return `Hi {{first_name}},\n\nI work on ${config.ourCrmName}, a CRM built for growing teams. I came across ${companyName} and wanted to introduce myself in case CRM is on your radar this year.\n\nWould a quick 15-minute intro be worth your time?\n\nBest,\n{{your_name}}`;
  }

  const top = [...signals].sort((a, b) => b.decayedWeight - a.decayedWeight).slice(0, 2);
  const hook = buildHook(top[0]);
  const second = top[1] ? ` I also noticed ${buildHookFragment(top[1])}.` : "";

  return `Hi {{first_name}},

${hook}${second}

I work on ${config.ourCrmName} — we help teams like ${companyName} move off clunky CRM setups with fast onboarding and pricing that scales sensibly. Given what's happening on your side, it felt worth reaching out directly.

Open to a quick 15-minute look at whether we're a fit?

Best,
{{your_name}}`;
}

function buildHook(signal: ScoredSignal): string {
  switch (signal.category) {
    case "competitor_displacement":
      return `I noticed some recent signals that ${signalContext(signal)} suggests your team may be re-evaluating its current CRM.`;
    case "hiring":
      return `I saw you're hiring around CRM/RevOps — ${signalContext(signal)} usually means a CRM project is underway.`;
    case "active_research":
      return `It looks like your team has been actively comparing CRM options recently (${signalContext(signal)}).`;
    case "procurement_rfp":
      return `I came across what looks like a CRM procurement/RFP effort on your side (${signalContext(signal)}).`;
    default:
      return `I came across a recent ${categoryLabel(signal.category)} signal on your side.`;
  }
}

function buildHookFragment(signal: ScoredSignal): string {
  return `${categoryLabel(signal.category).toLowerCase()} activity (${signalContext(signal)})`;
}

function signalContext(signal: ScoredSignal): string {
  const quote = signal.evidenceQuote.replace(/\s+/g, " ").trim();
  const short = quote.length > 90 ? quote.slice(0, 87) + "…" : quote;
  return `"${short}"`;
}
