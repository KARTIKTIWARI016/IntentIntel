import { prisma } from "@/lib/prisma";

export interface CompanyInput {
  name: string;
  url: string;
}

export function dailyBudget(): number {
  const n = Number(process.env.DAILY_API_BUDGET ?? "200");
  return Number.isFinite(n) && n > 0 ? n : 200;
}

export function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function nextUtcMidnight(d = new Date()): Date {
  const s = startOfUtcDay(d);
  return new Date(s.getTime() + 24 * 60 * 60 * 1000);
}

/** Real grounded API calls made today (cache hits create no run, so they're free). */
export async function apiCallsToday(): Promise<number> {
  return prisma.analysisRun.count({
    where: { status: "complete", createdAt: { gte: startOfUtcDay() } },
  });
}

export async function budgetStatus() {
  const used = await apiCallsToday();
  const limit = dailyBudget();
  return { used, limit, remaining: Math.max(0, limit - used), overBudget: used >= limit };
}

/** Enqueue a single company (used when over daily budget on an on-demand lookup). */
export async function enqueueSingle(input: CompanyInput) {
  return prisma.job.create({
    data: { type: "single", payload: JSON.stringify(input) },
  });
}

/** Create a batch from CSV rows and enqueue one job per company. */
export async function enqueueBatch(items: CompanyInput[], name?: string) {
  const batch = await prisma.batch.create({
    data: { name: name ?? null, total: items.length },
  });
  await prisma.job.createMany({
    data: items.map((it) => ({
      type: "bulk_item",
      batchId: batch.id,
      payload: JSON.stringify(it),
    })),
  });
  return batch;
}

export async function getBatchProgress(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) return null;
  const jobs = await prisma.job.findMany({
    where: { batchId },
    orderBy: { createdAt: "asc" },
  });
  const counts = jobs.reduce(
    (acc, j) => ((acc[j.status] = (acc[j.status] ?? 0) + 1), acc),
    {} as Record<string, number>,
  );
  return { batch, jobs, counts };
}

/** Claim the next runnable job (single-worker model; simple guarded update). */
export async function claimNextJob() {
  const job = await prisma.job.findFirst({
    where: { status: "queued", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
  });
  if (!job) return null;
  const res = await prisma.job.updateMany({
    where: { id: job.id, status: "queued" },
    data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
  });
  if (res.count === 0) return null; // someone else grabbed it
  return prisma.job.findUnique({ where: { id: job.id } });
}

export async function markJobDone(jobId: string, resultRunId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "done", resultRunId, finishedAt: new Date(), errorMessage: null },
  });
}

export async function markJobFailedOrRetry(jobId: string, error: string, backoffMs = 60_000) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;
  if (job.attempts >= job.maxAttempts) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: error, finishedAt: new Date() },
    });
  } else {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "queued",
        errorMessage: error,
        scheduledFor: new Date(Date.now() + backoffMs),
      },
    });
  }
}

/** Push a job to the next UTC day when the daily budget is exhausted. */
export async function deferJobToTomorrow(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "queued", scheduledFor: nextUtcMidnight() },
  });
}
