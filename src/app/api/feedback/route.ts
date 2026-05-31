import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  runId: z.string().min(1),
  verdict: z.enum(["accept", "reject"]),
  note: z.string().optional(),
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
  const { runId, verdict, note } = parsed.data;

  const run = await prisma.analysisRun.findUnique({ where: { id: runId } });
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  const feedback = await prisma.feedback.upsert({
    where: { analysisRunId: runId },
    create: { analysisRunId: runId, verdict, note: note ?? null },
    update: { verdict, note: note ?? null },
  });

  return NextResponse.json({ ok: true, feedback });
}
