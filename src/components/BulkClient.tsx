"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { Upload, Loader2, ListChecks } from "lucide-react";
import { StageBadge } from "@/components/Report";

interface Item {
  name: string;
  url: string;
}
interface BatchResult {
  runId: string;
  company: string;
  domain: string;
  intentScore: number;
  confidence: number;
  buyingStage: string;
}
interface Progress {
  total: number;
  done: number;
  counts: Record<string, number>;
  results: BatchResult[];
  failures: { payload: string; error: string | null }[];
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) return (row[k] ?? "").trim();
  }
  return "";
}

export function BulkClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function ingestRows(rows: Record<string, string>[]) {
    const parsed = rows
      .map((r) => ({
        name: pick(r, ["name", "company", "company name"]),
        url: pick(r, ["url", "website", "domain", "site"]),
      }))
      .filter((it) => it.name && it.url);
    setItems(parsed);
    setError(parsed.length ? null : "No rows with both a name and url/website column were found.");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => ingestRows(res.data),
      error: () => setError("Could not parse that CSV file."),
    });
  }

  function onPaste(text: string) {
    if (!text.trim()) {
      setItems([]);
      return;
    }
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => ingestRows(res.data),
    });
  }

  async function submit() {
    if (!items.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Upload failed.");
      else setBatchId(data.batchId);
    } finally {
      setSubmitting(false);
    }
  }

  // Poll progress.
  useEffect(() => {
    if (!batchId) return;
    let active = true;
    const load = async () => {
      const res = await fetch(`/api/bulk/${batchId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (active) setProgress(data);
    };
    load();
    const t = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [batchId]);

  const pending = progress ? progress.total - progress.done - (progress.counts["failed"] ?? 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Analysis</h1>
        <p className="text-[var(--color-muted)] mt-1">
          Upload or paste a CSV with <code className="text-[var(--color-brand-ink)]">name</code> and{" "}
          <code className="text-[var(--color-brand-ink)]">url</code> columns. Companies are queued and
          processed by the worker within the free-tier rate limit.
        </p>
      </div>

      {!batchId && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm">
              <Upload size={15} /> Choose CSV file
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            <span className="text-xs text-[var(--color-muted)]">or paste below</span>
          </div>
          <textarea
            onChange={(e) => onPaste(e.target.value)}
            placeholder={"name,url\nAcme Corp,acme.com\nGlobex,globex.com"}
            rows={6}
            className="field font-mono"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-muted)]">{items.length} companies ready</span>
            <button
              onClick={submit}
              disabled={!items.length || submitting}
              className="btn-primary px-5 py-2 text-sm flex items-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />}
              Queue {items.length || ""} companies
            </button>
          </div>
        </div>
      )}

      {batchId && progress && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                {progress.done}/{progress.total} processed
                {pending > 0 && (
                  <span className="text-[var(--color-muted)] font-normal"> · {pending} pending</span>
                )}
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                Make sure the worker is running: <code className="text-[var(--color-brand-ink)]">npm run worker</code>
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#e8eee3] overflow-hidden">
              <div
                className="h-full bg-[var(--color-brand)] transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
            {(progress.counts["failed"] ?? 0) > 0 && (
              <p className="text-xs text-red-600 mt-2">{progress.counts["failed"]} failed</p>
            )}
          </div>

          {progress.results.length > 0 && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-2)] text-[var(--color-muted)] text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Company</th>
                    <th className="text-left px-4 py-2">Intent</th>
                    <th className="text-left px-4 py-2">Confidence</th>
                    <th className="text-left px-4 py-2">Stage</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {progress.results.map((r) => (
                    <tr key={r.runId} className="border-t border-[var(--color-line)]">
                      <td className="px-4 py-2">
                        <div className="font-medium">{r.company}</div>
                        <div className="text-xs text-[var(--color-muted)]">{r.domain}</div>
                      </td>
                      <td className="px-4 py-2 font-semibold">{r.intentScore}</td>
                      <td className="px-4 py-2">{r.confidence}</td>
                      <td className="px-4 py-2">
                        <StageBadge stage={r.buyingStage} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/report/${r.runId}`} className="text-[var(--color-brand-ink)] hover:underline text-xs">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={() => {
              setBatchId(null);
              setProgress(null);
              setItems([]);
            }}
            className="text-sm text-[var(--color-brand-ink)] hover:underline"
          >
            ← Start a new batch
          </button>
        </div>
      )}
    </div>
  );
}
