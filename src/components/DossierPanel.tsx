"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Loader2, Download, RefreshCw, Clock, ShieldAlert } from "lucide-react";

interface Dossier {
  id: string;
  name: string;
  domain: string;
  model: string;
  markdown: string;
  sources: { title: string; uri: string }[];
  queries: string[];
  cached: boolean;
  createdAt: string;
}

export function DossierPanel({ name, url }: { name: string; url: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);

  async function generate(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dossier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, forceRefresh }),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") setError(data.error ?? "Dossier generation failed.");
      else setDossier(data.dossier);
    } catch {
      setError("Network error during dossier generation.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!dossier) return;
    const blob = new Blob([dossier.markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${dossier.domain}-dossier.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <FileText size={16} className="text-[var(--color-brand)]" /> Full Account Dossier
          </h3>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            9-section deep research: intelligence, stakeholders, competitive landscape, ABM &
            outreach. Grounded with Google Search · takes 1–3 min.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dossier && (
            <>
              <button onClick={download} className="btn-ghost text-xs flex items-center gap-1 px-2.5 py-1.5">
                <Download size={13} /> .md
              </button>
              <button
                onClick={() => generate(true)}
                disabled={loading}
                className="btn-ghost text-xs flex items-center gap-1 px-2.5 py-1.5"
              >
                <RefreshCw size={13} /> Regenerate
              </button>
            </>
          )}
          {!dossier && (
            <button
              onClick={() => generate(false)}
              disabled={loading}
              className="btn-primary text-sm flex items-center gap-2 px-4 py-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              {loading ? "Researching…" : "Generate full dossier"}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-sm text-[var(--color-muted)] flex items-center gap-2 mt-4">
          <Loader2 size={14} className="animate-spin" /> Running deep web research across news,
          funding, tech stack, jobs, LinkedIn and reviews — this can take a couple of minutes.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-4 py-3 border border-red-500/30 mt-4">
          {error}
        </div>
      )}

      {dossier && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mb-3 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-success-soft)] text-[var(--color-brand-deep)]">{dossier.model}</span>
            {dossier.cached && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-success-soft)] text-[var(--color-brand-deep)] flex items-center gap-1">
                <Clock size={11} /> cached
              </span>
            )}
            {dossier.sources.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-success-soft)] text-[var(--color-brand-deep)]">{dossier.sources.length} sources</span>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <span>
              Stakeholder names &amp; LinkedIn data are AI-generated and may be inaccurate — verify
              before outreach. EU/UK individuals are subject to GDPR.
            </span>
          </div>

          <div className="md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{dossier.markdown}</ReactMarkdown>
          </div>

          {dossier.sources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[var(--color-line)]">
              <h4 className="text-sm font-semibold mb-2">Grounding Sources</h4>
              <ul className="space-y-1 max-h-48 overflow-auto scroll-thin">
                {dossier.sources.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--color-brand-ink)] hover:underline break-all"
                    >
                      {s.title || s.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
