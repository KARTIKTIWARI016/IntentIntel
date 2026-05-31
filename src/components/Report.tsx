"use client";

import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ExternalLink,
  Building2,
  Users,
  DollarSign,
  Database,
  Clock,
} from "lucide-react";
import type { IntentReport } from "@/lib/contract";
import { cn, stageLabel, categoryLabel } from "@/lib/utils";
import { DossierPanel } from "@/components/DossierPanel";

function scoreColor(score: number) {
  if (score >= 70) return { ring: "#22c55e" };
  if (score >= 40) return { ring: "#f59e0b" };
  return { ring: "#ef4444" };
}

export function ScoreRing({ score, label }: { score: number; label: string }) {
  const c = scoreColor(score);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e4ebdf" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={c.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="60" textAnchor="middle" fill="#043d32" fontSize="26" fontWeight="700">
          {score}
        </text>
      </svg>
      <span className="text-xs text-[var(--color-muted)] -mt-1">{label}</span>
    </div>
  );
}

const STAGE_STYLE: Record<string, string> = {
  unaware: "bg-zinc-100 text-zinc-700",
  aware: "bg-sky-50 text-sky-700",
  in_market: "bg-lime-100 text-[var(--color-brand-deep)]",
  evaluating: "bg-amber-50 text-amber-800",
  decision: "bg-emerald-100 text-emerald-800",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", STAGE_STYLE[stage] ?? "bg-white/10")}>
      {stageLabel(stage)}
    </span>
  );
}

const CATEGORY_STYLE: Record<string, string> = {
  competitor_displacement: "border-l-rose-400",
  hiring: "border-l-amber-400",
  active_research: "border-l-[var(--color-brand)]",
  procurement_rfp: "border-l-[var(--color-brand-deep)]",
};

function Firmo({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className="mt-0.5 text-[var(--color-muted)]" />
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
        <div className="text-sm text-[var(--color-ink)]">{value || "—"}</div>
      </div>
    </div>
  );
}

export function ReportView({ report }: { report: IntentReport }) {
  const [verdict, setVerdict] = useState<"accept" | "reject" | null>(
    (report.feedback?.verdict as "accept" | "reject" | undefined) ?? null,
  );
  const [note, setNote] = useState(report.feedback?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function sendFeedback(v: "accept" | "reject") {
    setSaving(true);
    setVerdict(v);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: report.runId, verdict: v, note }),
      });
    } finally {
      setSaving(false);
    }
  }

  function copyOutreach() {
    if (!report.outreach) return;
    navigator.clipboard.writeText(report.outreach);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={report.intentScore} label="Intent" />
          <ScoreRing score={report.confidence} label="Confidence" />
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{report.company.name}</h2>
              <StageBadge stage={report.buyingStage} />
              {report.cached && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-success-soft)] text-[var(--color-brand-deep)] flex items-center gap-1">
                  <Clock size={11} /> cached
                </span>
              )}
            </div>
            <a
              href={report.company.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--color-brand-ink)] hover:underline inline-flex items-center gap-1"
            >
              {report.company.domain} <ExternalLink size={12} />
            </a>
            {report.summary && (
              <p className="text-sm text-[var(--color-muted)] mt-2 whitespace-pre-line">
                {report.summary}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-[var(--color-line)]">
          <Firmo icon={Building2} label="Industry" value={report.company.industry} />
          <Firmo icon={Users} label="Employees" value={report.company.employeeCount} />
          <Firmo icon={DollarSign} label="Revenue est." value={report.company.revenueEstimate} />
          <Firmo icon={Database} label="Existing CRM" value={report.company.existingCrm} />
        </div>
        {report.company.techStack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {report.company.techStack.map((t) => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-success-soft)] text-[var(--color-brand-deep)]">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Signals */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">
          Detected Signals{" "}
          <span className="text-sm font-normal text-[var(--color-muted)]">({report.signals.length})</span>
        </h3>
        {report.signals.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No qualifying CRM buying-intent signals found in the recency window.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.signals.map((s, i) => (
              <li
                key={i}
                className={cn(
                  "bg-[var(--color-surface-2)] border border-[var(--color-line)] border-l-4 rounded-xl p-3",
                  CATEGORY_STYLE[s.category] ?? "border-l-zinc-400",
                )}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium">{categoryLabel(s.category)}</span>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <span>strength {s.strength}</span>
                    <span>·</span>
                    <span>{s.ageDays}d ago</span>
                    {s.sourceType && (
                      <span className="px-1.5 py-0.5 rounded bg-white border border-[var(--color-line)]">{s.sourceType}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#31403b] mt-1.5 italic">&quot;{s.evidenceQuote}&quot;</p>
                {s.sourceUrl && (
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--color-brand-ink)] hover:underline inline-flex items-center gap-1 mt-1 break-all"
                  >
                    {s.sourceUrl} <ExternalLink size={11} className="shrink-0" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Outreach */}
      {report.outreach && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Suggested Outreach</h3>
            <button onClick={copyOutreach} className="btn-ghost text-xs flex items-center gap-1 px-2.5 py-1.5">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="text-sm text-[#31403b] whitespace-pre-wrap font-sans bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-xl p-3">
            {report.outreach}
          </pre>
        </div>
      )}

      {/* Sources + Feedback */}
      <div className="grid md:grid-cols-2 gap-5">
        {report.groundingSources.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold mb-2 text-sm">Grounding Sources</h3>
            <ul className="space-y-1 max-h-40 overflow-auto scroll-thin">
              {report.groundingSources.map((src, i) => (
                <li key={i}>
                  <a
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--color-brand-ink)] hover:underline break-all"
                  >
                    {src.title || src.uri}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card p-5">
          <h3 className="font-semibold mb-2 text-sm">SDR Feedback</h3>
          <div className="flex gap-2">
            <button
              onClick={() => sendFeedback("accept")}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors",
                verdict === "accept"
                  ? "bg-[var(--color-brand-deep)] text-white border-[var(--color-brand-deep)]"
                  : "border-[var(--color-line)] hover:bg-[var(--color-success-soft)] text-[var(--color-brand-deep)]",
              )}
            >
              <ThumbsUp size={15} /> Accept
            </button>
            <button
              onClick={() => sendFeedback("reject")}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors",
                verdict === "reject"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-[var(--color-line)] hover:bg-red-50 text-red-600",
              )}
            >
              <ThumbsDown size={15} /> Reject
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => verdict && sendFeedback(verdict)}
            placeholder="Optional note (why accepted / rejected)…"
            className="field mt-3"
            rows={2}
          />
        </div>
      </div>

      <DossierPanel name={report.company.name} url={report.company.url} />
    </div>
  );
}
