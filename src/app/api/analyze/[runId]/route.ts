import { NextResponse } from "next/server";
import { findRunWithRelations, toReport } from "@/lib/intent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const run = await findRunWithRelations(runId);
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  return NextResponse.json({ report: toReport(run, false) });
}
