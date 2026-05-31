"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { stageLabel } from "@/lib/utils";

interface Metrics {
  totalRuns: number;
  totalCompanies: number;
  accepts: number;
  rejects: number;
  reviewed: number;
  acceptanceRate: number | null;
  avgIntentScore: number;
  stageDistribution: Record<string, number>;
  trend: { date: string; accept: number; reject: number; rate: number | null }[];
  cacheSavingsPct: number;
  budget: { used: number; limit: number; remaining: number };
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-[var(--color-muted)] mt-1">{sub}</div>}
    </div>
  );
}

export function MetricsClient() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then(setM)
      .catch(() => {});
  }, []);

  if (!m) {
    return (
      <div className="flex items-center gap-2 text-[var(--color-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading metrics…
      </div>
    );
  }

  const stageMax = Math.max(1, ...Object.values(m.stageDistribution));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Metrics</h1>
        <p className="text-[var(--color-muted)] mt-1">
          North-star: <strong className="text-[var(--color-ink)]">SDR acceptance rate</strong> on
          surfaced accounts.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Acceptance Rate"
          value={m.acceptanceRate === null ? "—" : `${m.acceptanceRate}%`}
          sub={`${m.accepts} accepted · ${m.rejects} rejected`}
        />
        <Kpi label="Companies Analyzed" value={String(m.totalCompanies)} sub={`${m.totalRuns} total runs`} />
        <Kpi label="Avg Intent Score" value={String(m.avgIntentScore)} sub="recent runs" />
        <Kpi
          label="Free-tier Budget"
          value={`${m.budget.used}/${m.budget.limit}`}
          sub={`${m.budget.remaining} remaining today`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Buying-Stage Distribution</h3>
          {Object.keys(m.stageDistribution).length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No analyses yet.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(m.stageDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([stage, count]) => (
                  <li key={stage} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-[var(--color-muted)]">{stageLabel(stage)}</span>
                    <div className="flex-1 h-3 rounded-full bg-[#e8eee3] overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-brand)]"
                        style={{ width: `${(count / stageMax) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Acceptance Trend (last 14 days)</h3>
          {m.trend.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No feedback yet. Accept/reject reports to build the trend.
            </p>
          ) : (
            <div className="flex items-end gap-1.5 h-40">
              {m.trend.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${d.date}: ${d.rate ?? 0}%`}>
                  <div
                    className="w-full bg-[var(--color-brand)] rounded-t"
                    style={{ height: `${((d.rate ?? 0) / 100) * 100}%`, minHeight: d.rate === null ? 0 : 4 }}
                  />
                  <span className="text-[9px] text-[var(--color-muted)]">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Cache savings ≈ {m.cacheSavingsPct}% (re-analyses served from the 30-day cache instead of new
        API calls).
      </p>
    </div>
  );
}
