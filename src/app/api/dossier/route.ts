import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDossier, getCachedDossier } from "@/lib/dossier";
import { normalizeDomain } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // dossier generation with Pro can take a few minutes

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

  if (!forceRefresh) {
    const cached = await getCachedDossier(normalizeDomain(url || name));
    if (cached) return NextResponse.json({ status: "complete", dossier: cached });
  }

  try {
    const dossier = await generateDossier(name, url, { forceRefresh });
    return NextResponse.json({ status: "complete", dossier });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dossier generation failed.";
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
