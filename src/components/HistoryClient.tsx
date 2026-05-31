"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
import { StageBadge } from "@/components/Report";

interface HistoryItem {
  runId: string;
  companyName: string;
  domain: string;
  url: string;
  intentScore: number;
  confidence: number;
  buyingStage: string;
  summary: string;
  signalCount: number;
  feedbackVerdict: string | null;
  createdAt: string;
  expiresAt: string;
}

interface Status {
  supabase?: {
    configured: boolean;
    urlConfigured: boolean;
    keyConfigured: boolean;
    secretKeyConfigured: boolean;
    databaseConfigured: boolean;
    persistentHistory: boolean;
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HistoryClient() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("limit", "75");

    fetch(`/api/history?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setHistory(data.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  const stats = useMemo(() => {
    const avgIntent = history.length
      ? Math.round(history.reduce((sum, item) => sum + item.intentScore, 0) / history.length)
      : 0;
    const hotAccounts = history.filter((item) => item.intentScore >= 70).length;
    return { avgIntent, hotAccounts };
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="top-bar -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-2 px-4 sm:px-6 lg:px-8 h-auto lg:h-16 py-4 lg:py-0 flex flex-col lg:flex-row lg:items-center gap-4">
        <div>
          <h1 className="text-base font-semibold">History</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Review previous account analyses and open saved reports.
          </p>
        </div>
        <label className="lg:ml-auto field max-w-md flex items-center gap-2 py-2">
          <Search size={16} className="text-[var(--color-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or domain"
            className="min-w-0 flex-1 bg-transparent outline-none text-sm"
          />
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="soft-panel p-5">
          <div className="text-sm text-[var(--color-brand-deep)]/75">Saved analyses</div>
          <div className="mt-2 text-4xl font-semibold">{history.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--color-muted)]">Average intent</div>
          <div className="mt-2 text-4xl font-semibold text-[var(--color-brand-deep)]">
            {stats.avgIntent}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-[var(--color-muted)]">High-intent accounts</div>
          <div className="mt-2 text-4xl font-semibold text-[var(--color-brand-deep)]">
            {stats.hotAccounts}
          </div>
        </div>
      </div>

      {status?.supabase && !status.supabase.persistentHistory && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="font-semibold">History is visible, but not yet retained in Supabase.</div>
          <p className="mt-1">
            Supabase keys are detected, but the database connection is still local SQLite. Add your
            Supabase Postgres connection string as <code>DATABASE_URL</code> to retain history
            across deploys.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-[var(--color-line)]">
          <div className="font-semibold">Analysis History</div>
          {loading && (
            <span className="text-xs text-[var(--color-muted)] flex items-center gap-1">
              <Loader2 size={13} className="animate-spin" /> Loading
            </span>
          )}
        </div>

        {history.length === 0 && !loading ? (
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            No analyses saved yet. Run an account analysis and it will appear here.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-line)]">
            {history.map((item) => (
              <div key={item.runId} className="p-5 grid xl:grid-cols-[1fr_auto] gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/report/${item.runId}`}
                      className="font-semibold hover:text-[var(--color-brand-deep)]"
                    >
                      {item.companyName}
                    </Link>
                    <StageBadge stage={item.buyingStage} />
                    {item.feedbackVerdict && (
                      <span className="status-pill px-2 py-0.5 text-xs inline-flex items-center gap-1">
                        <ShieldCheck size={12} /> {item.feedbackVerdict}
                      </span>
                    )}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 text-xs text-[var(--color-brand-deep)] hover:underline inline-flex items-center gap-1"
                  >
                    {item.domain} <ExternalLink size={11} />
                  </a>
                  {item.summary && (
                    <p className="mt-2 text-sm text-[var(--color-muted)] line-clamp-3 whitespace-pre-line">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-3 text-xs text-[var(--color-muted)] flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {formatDate(item.createdAt)}
                    </span>
                    <span>{item.signalCount} signals</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 xl:w-56">
                  <div className="rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-line)] p-3">
                    <div className="text-xs text-[var(--color-muted)]">Intent</div>
                    <div className="text-2xl font-semibold text-[var(--color-brand-deep)]">
                      {item.intentScore}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-line)] p-3">
                    <div className="text-xs text-[var(--color-muted)]">Confidence</div>
                    <div className="text-2xl font-semibold">{item.confidence}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
