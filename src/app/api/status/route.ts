import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { budgetStatus } from "@/lib/queue";
import { getConfig } from "@/lib/config";
import { supabaseStatus } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [budget, queued, running, config, hasKey] = await Promise.all([
    budgetStatus(),
    prisma.job.count({ where: { status: "queued" } }),
    prisma.job.count({ where: { status: "running" } }),
    getConfig(),
    Promise.resolve(Boolean(process.env.GEMINI_API_KEY)),
  ]);
  return NextResponse.json({
    budget,
    queue: { queued, running },
    ourCrmName: config.ourCrmName,
    geminiModel: config.geminiModel,
    apiKeyConfigured: hasKey,
    supabase: supabaseStatus(),
  });
}
