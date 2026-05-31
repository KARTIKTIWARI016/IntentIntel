import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueBatch } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
      }),
    )
    .min(1, "At least one company is required")
    .max(2000, "Too many rows (max 2000 per upload)"),
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
  const batch = await enqueueBatch(parsed.data.items, parsed.data.name);
  return NextResponse.json({ batchId: batch.id, total: batch.total }, { status: 202 });
}
