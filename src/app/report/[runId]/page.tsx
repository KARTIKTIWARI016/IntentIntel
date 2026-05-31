import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { findRunWithRelations, toReport } from "@/lib/intent";
import { ReportView } from "@/components/Report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await findRunWithRelations(runId);

  if (!run) {
    return (
      <div className="space-y-4">
        <Link href="/bulk" className="text-sm text-[var(--color-brand-ink)] inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <p className="text-[var(--color-muted)]">Report not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/bulk" className="text-sm text-[var(--color-brand-ink)] inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back to bulk
      </Link>
      <ReportView report={toReport(run, false)} />
    </div>
  );
}
