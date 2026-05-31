import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { budgetStatus } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const [totalRuns, totalCompanies, feedback, budget, recentRuns] = await Promise.all([
    prisma.analysisRun.count({ where: { status: "complete" } }),
    prisma.company.count(),
    prisma.feedback.findMany({ select: { verdict: true, createdAt: true } }),
    budgetStatus(),
    prisma.analysisRun.findMany({
      where: { status: "complete" },
      select: { intentScore: true, buyingStage: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const accepts = feedback.filter((f) => f.verdict === "accept").length;
  const rejects = feedback.filter((f) => f.verdict === "reject").length;
  const reviewed = accepts + rejects;
  const acceptanceRate = reviewed ? Math.round((accepts / reviewed) * 100) : null;

  // Acceptance over the last 14 days (north-star trend).
  const byDay: Record<string, { accept: number; reject: number }> = {};
  for (const f of feedback) {
    const k = dayKey(f.createdAt);
    byDay[k] ??= { accept: 0, reject: 0 };
    if (f.verdict === "accept") byDay[k].accept++;
    else byDay[k].reject++;
  }
  const trend = Object.entries(byDay)
    .map(([date, v]) => ({
      date,
      accept: v.accept,
      reject: v.reject,
      rate: v.accept + v.reject ? Math.round((v.accept / (v.accept + v.reject)) * 100) : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  // Stage distribution + avg score across recent runs.
  const stageDistribution: Record<string, number> = {};
  let scoreSum = 0;
  for (const r of recentRuns) {
    stageDistribution[r.buyingStage] = (stageDistribution[r.buyingStage] ?? 0) + 1;
    scoreSum += r.intentScore;
  }
  const avgIntentScore = recentRuns.length ? Math.round(scoreSum / recentRuns.length) : 0;

  // Reanalysis proxy: runs beyond one-per-company are cache-saved repeats.
  const cacheSavingsPct =
    totalRuns > 0 && totalCompanies > 0
      ? Math.max(0, Math.round((1 - totalCompanies / totalRuns) * 100))
      : 0;

  return NextResponse.json({
    totalRuns,
    totalCompanies,
    accepts,
    rejects,
    reviewed,
    acceptanceRate,
    avgIntentScore,
    stageDistribution,
    trend,
    cacheSavingsPct,
    budget,
  });
}
