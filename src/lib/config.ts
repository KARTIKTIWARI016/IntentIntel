import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import { SIGNAL_CATEGORIES } from "@/lib/contract";

export interface AppConfig {
  ourCrmName: string;
  competitors: string[];
  intentDef: string;
  recencyDays: number;
  decayHalfLife: number;
  signalWeights: Record<string, number>;
  geminiModel: string;
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  competitor_displacement: 1.0,
  procurement_rfp: 1.0,
  active_research: 0.8,
  hiring: 0.6,
};

/** Load the singleton config, creating it with defaults on first run. */
export async function getConfig(): Promise<AppConfig> {
  const row = await prisma.config.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  const weights = safeJsonParse<Record<string, number>>(row.signalWeights, DEFAULT_WEIGHTS);
  // Guarantee every category has a weight.
  for (const c of SIGNAL_CATEGORIES) {
    if (typeof weights[c] !== "number") weights[c] = DEFAULT_WEIGHTS[c] ?? 0.5;
  }

  return {
    ourCrmName: row.ourCrmName,
    competitors: safeJsonParse<string[]>(row.competitors, []),
    intentDef: row.intentDef,
    recencyDays: row.recencyDays,
    decayHalfLife: row.decayHalfLife,
    signalWeights: weights,
    geminiModel: row.geminiModel,
  };
}

export async function updateConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  await prisma.config.update({
    where: { id: "singleton" },
    data: {
      ...(patch.ourCrmName !== undefined ? { ourCrmName: patch.ourCrmName } : {}),
      ...(patch.competitors !== undefined
        ? { competitors: JSON.stringify(patch.competitors) }
        : {}),
      ...(patch.intentDef !== undefined ? { intentDef: patch.intentDef } : {}),
      ...(patch.recencyDays !== undefined ? { recencyDays: patch.recencyDays } : {}),
      ...(patch.decayHalfLife !== undefined ? { decayHalfLife: patch.decayHalfLife } : {}),
      ...(patch.signalWeights !== undefined
        ? { signalWeights: JSON.stringify(patch.signalWeights) }
        : {}),
      ...(patch.geminiModel !== undefined ? { geminiModel: patch.geminiModel } : {}),
    },
  });
  return getConfig();
}
