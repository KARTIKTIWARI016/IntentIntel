"use client";

import { useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search, Send, ShieldCheck, Sparkles } from "lucide-react";
import type { IntentReport } from "@/lib/contract";
import { ReportView } from "@/components/Report";

export function AnalyzeClient() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [report, setReport] = useState<IntentReport | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setReport(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, forceRefresh }),
      });
      const data = await res.json();
      if (res.status === 202) {
        setNotice(data.message ?? "Queued for processing.");
      } else if (!res.ok || data.status === "error") {
        setError(data.error ?? "Analysis failed.");
      } else {
        setReport(data.report);
      }
    } catch {
      setError("Network error - is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="top-bar -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-2 px-4 sm:px-6 lg:px-8 h-auto lg:h-16 py-4 lg:py-0 flex flex-col lg:flex-row lg:items-center gap-4">
        <div>
          <h1 className="text-base font-semibold">Analyze</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Research public CRM buying intent with cited evidence.
          </p>
        </div>
        <div className="lg:ml-auto field max-w-md flex items-center gap-2 py-2">
          <Search size={16} className="text-[var(--color-muted)]" />
          <span className="text-sm text-[var(--color-muted)]">Search anything</span>
          <kbd className="ml-auto text-[11px] px-1.5 py-0.5 rounded-md border border-[var(--color-line)] text-[var(--color-muted)]">
            /
          </kbd>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-5">
        <section className="soft-panel p-5 min-h-[14rem] overflow-hidden relative">
          <div className="absolute -right-20 -bottom-24 w-72 h-72 rounded-full border-[34px] border-white/25" />
          <div className="absolute right-6 top-8 w-28 h-28 rounded-full bg-white/18 blur-sm" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="status-pill px-3 py-1 text-xs font-semibold bg-white/70">
                Gemini + Google Search
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--color-brand-deep)]">
                <Sparkles size={17} />
              </span>
            </div>
            <h2 className="mt-8 text-3xl sm:text-4xl font-semibold tracking-normal max-w-xl">
              Spot CRM buying intent before your competitors do.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--color-brand-deep)]/78">
              Enter a company and URL. IntentIntel searches public web signals, scores the account,
              and produces a cited report for SDR review.
            </p>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Intent Readiness</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Signal quality benchmark</p>
            </div>
            <ShieldCheck size={19} className="text-[var(--color-brand-deep)]" />
          </div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <div className="text-3xl font-semibold text-[var(--color-brand-deep)]">Evidence-first</div>
              <div className="mt-2 text-sm text-[var(--color-muted)]">Signals, sources, confidence</div>
            </div>
            <div className="text-4xl font-semibold">92%</div>
          </div>
          <div className="mt-6 h-4 rounded-md bg-[#e8eee3] overflow-hidden flex gap-1">
            <div className="h-full rounded-md bg-[var(--color-brand-deep)] flex-[4]" />
            <div className="h-full rounded-md bg-[var(--color-brand)] flex-1" />
          </div>
        </section>
      </div>

      <form onSubmit={analyze} className="card p-5 grid lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
            Company name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Acme Corp"
            className="field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
            Website / URL
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="acme.com"
            className="field"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary h-[44px] px-6 text-sm flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? "Researching..." : "Analyze"}
        </button>
        <label className="lg:col-span-3 flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={forceRefresh}
            onChange={(e) => setForceRefresh(e.target.checked)}
            className="accent-[var(--color-brand-deep)]"
          />
          <RefreshCw size={12} /> Force fresh analysis and ignore the 30-day cache
        </label>
      </form>

      {loading && (
        <div className="card px-4 py-3 text-sm text-[var(--color-muted)] flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Searching the public web and scoring
          signals. This can take 20-60 seconds.
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3 border border-red-200 flex gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-amber-50 text-amber-800 text-sm px-4 py-3 border border-amber-200">
          {notice}
        </div>
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}
