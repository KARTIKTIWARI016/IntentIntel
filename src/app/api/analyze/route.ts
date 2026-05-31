import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeCompany, getCachedReport } from "@/lib/intent";
import { budgetStatus, enqueueSingle } from "@/lib/queue";
import { normalizeDomain } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  url: z.string().min(1, "Company URL is required"),
  forceRefresh: z.boolean().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { name, url, forceRefresh } = parsed.data;

  // Cache hits are always free and instant.
  if (!forceRefresh) {
    const cached = await getCachedReport(normalizeDomain(url || name));
    if (cached) return NextResponse.json({ status: "complete", report: cached });
  }

  // Enforce the free-tier daily budget: overflow goes to the queue for tomorrow.
  const budget = await budgetStatus();
  if (budget.overBudget) {
    const job = await enqueueSingle({ name, url });
    return NextResponse.json(
      {
        status: "queued",
        jobId: job.id,
        message: `Daily free-tier budget reached (${budget.used}/${budget.limit}). Queued for the next run.`,
        budget,
      },
      { status: 202 },
    );
  }

  try {
    const report = await analyzeCompany(name, url, { forceRefresh });
    return NextResponse.json({ status: "complete", report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
