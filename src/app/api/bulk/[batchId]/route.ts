import { NextResponse } from "next/server";
import { getBatchProgress } from "@/lib/queue";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const progress = await getBatchProgress(batchId);
  if (!progress) return NextResponse.json({ error: "Batch not found." }, { status: 404 });

  // Build ranked result rows for completed jobs.
  const doneRunIds = progress.jobs
    .filter((j) => j.status === "done" && j.resultRunId)
    .map((j) => j.resultRunId as string);

  const runs = doneRunIds.length
    ? await prisma.analysisRun.findMany({
        where: { id: { in: doneRunIds } },
        include: { company: true },
      })
    : [];

  const results = runs
    .map((r) => ({
      runId: r.id,
      company: r.company.name,
      domain: r.company.domain,
      intentScore: r.intentScore,
      confidence: r.confidence,
      buyingStage: r.buyingStage,
    }))
    .sort((a, b) => b.intentScore - a.intentScore);

  const failures = progress.jobs
    .filter((j) => j.status === "failed")
    .map((j) => ({ payload: j.payload, error: j.errorMessage }));

  return NextResponse.json({
    batch: progress.batch,
    counts: progress.counts,
    total: progress.batch.total,
    done: progress.counts["done"] ?? 0,
    results,
    failures,
  });
}
