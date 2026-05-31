import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfig, updateConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ config: await getConfig() });
}

const PatchSchema = z.object({
  ourCrmName: z.string().min(1).optional(),
  competitors: z.array(z.string().min(1)).optional(),
  intentDef: z.string().min(1).optional(),
  recencyDays: z.number().int().min(1).max(365).optional(),
  decayHalfLife: z.number().int().min(1).max(365).optional(),
  signalWeights: z.record(z.string(), z.number().min(0).max(5)).optional(),
  geminiModel: z.string().min(1).optional(),
});

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const config = await updateConfig(parsed.data);
  return NextResponse.json({ config });
}
