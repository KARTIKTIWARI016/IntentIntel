import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const runs = await prisma.analysisRun.findMany({
    where: {
      status: "complete",
      ...(q
        ? {
            company: {
              OR: [
                { name: { contains: q } },
                { domain: { contains: q } },
                { url: { contains: q } },
              ],
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      company: true,
      signals: { select: { id: true } },
      feedback: { select: { verdict: true } },
    },
  });

  return NextResponse.json({
    history: runs.map((run) => ({
      runId: run.id,
      companyName: run.company.name,
      domain: run.company.domain,
      url: run.company.url,
      intentScore: run.intentScore,
      confidence: run.confidence,
      buyingStage: run.buyingStage,
      summary: run.summary ?? "",
      signalCount: run.signals.length,
      feedbackVerdict: run.feedback?.verdict ?? null,
      createdAt: run.createdAt.toISOString(),
      expiresAt: run.expiresAt.toISOString(),
    })),
  });
}
