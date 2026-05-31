"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Check } from "lucide-react";
import { categoryLabel } from "@/lib/utils";

interface AppConfig {
  ourCrmName: string;
  competitors: string[];
  intentDef: string;
  recencyDays: number;
  decayHalfLife: number;
  signalWeights: Record<string, number>;
  geminiModel: string;
}

export function ConfigClient() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [competitorsText, setCompetitorsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setCfg(d.config);
        setCompetitorsText(d.config.competitors.join(", "));
      })
      .catch(() => setError("Failed to load config."));
  }, []);

  if (!cfg) {
    return (
      <div className="flex items-center gap-2 text-[var(--color-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  function set<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    setCfg((c) => (c ? { ...c, [key]: value } : c));
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const competitors = competitorsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfg, competitors }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Save failed.");
      else {
        setCfg(data.config);
        setCompetitorsText(data.config.competitors.join(", "));
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    } finally {
      setSaving(false);
    }
  }

  const label = "block text-xs font-medium text-[var(--color-muted)] mb-1";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--color-muted)] mt-1">
          Tune how IntentIntel defines intent and scores signals. Changes apply to new analyses.
        </p>
      </div>

      <section className="card p-5 space-y-4">
        <h3 className="font-semibold">Your Product</h3>
        <div>
          <label className={label}>Your CRM product name</label>
          <input value={cfg.ourCrmName} onChange={(e) => set("ourCrmName", e.target.value)} className="field" />
        </div>
        <div>
          <label className={label}>Competitors (comma-separated)</label>
          <input value={competitorsText} onChange={(e) => setCompetitorsText(e.target.value)} className="field" />
        </div>
        <div>
          <label className={label}>Intent definition</label>
          <textarea
            value={cfg.intentDef}
            onChange={(e) => set("intentDef", e.target.value)}
            rows={3}
            className="field"
          />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="font-semibold">Scoring</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Recency window (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={cfg.recencyDays}
              onChange={(e) => set("recencyDays", Number(e.target.value))}
              className="field"
            />
          </div>
          <div>
            <label className={label}>Decay half-life (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={cfg.decayHalfLife}
              onChange={(e) => set("decayHalfLife", Number(e.target.value))}
              className="field"
            />
          </div>
          <div>
            <label className={label}>Gemini model</label>
            <input value={cfg.geminiModel} onChange={(e) => set("geminiModel", e.target.value)} className="field" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-2">
            Signal weights (0–5)
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(cfg.signalWeights).map(([cat, w]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm w-44">{categoryLabel(cat)}</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={5}
                  value={w}
                  onChange={(e) =>
                    set("signalWeights", { ...cfg.signalWeights, [cat]: Number(e.target.value) })
                  }
                  className="field w-24"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button onClick={save} disabled={saving} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
        {saved ? "Saved" : "Save settings"}
      </button>
    </div>
  );
}
