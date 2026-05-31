"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CircleHelp,
  Radar,
  Search,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Analyze", icon: Radar },
  { href: "/bulk", label: "Bulk Queue", icon: Upload },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface Status {
  apiKeyConfigured: boolean;
  ourCrmName: string;
  budget: { used: number; limit: number; remaining: number };
  queue: { queued: number; running: number };
}

export function Nav() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [pathname]);

  return (
    <aside className="side-rail flex flex-col">
      <div className="h-16 px-5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 font-semibold text-[var(--color-ink)]">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-[var(--color-brand)] text-[var(--color-brand-deep)] shadow-[0_10px_24px_rgba(113,205,77,0.38)]">
            <Activity size={18} />
          </span>
          <span>IntentIntel</span>
        </Link>
      </div>

      <div className="top-bar lg:hidden px-4 py-3">
        <div className="field flex items-center gap-2 py-2">
          <Search size={15} className="text-[var(--color-muted)]" />
          <span className="text-sm text-[var(--color-muted)]">Search accounts</span>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="card p-3 flex items-center gap-3 shadow-none">
          <div className="grid w-9 h-9 place-items-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-brand-deep)]">
            <Sparkles size={17} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{status?.ourCrmName || "OUR_CRM"}</div>
            <div className="text-xs text-[var(--color-muted)]">CRM intent workspace</div>
          </div>
        </div>
      </div>

      <nav className="px-4 space-y-1">
        <div className="px-2 pb-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          Main Menu
        </div>
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-white text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-white/70",
              )}
            >
              <Icon size={17} className={active ? "text-[var(--color-brand-deep)]" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mt-7 space-y-1">
        <div className="px-2 pb-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          Status
        </div>
        {status && (
          <>
            {!status.apiKeyConfigured && (
              <Link
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 text-amber-800 text-sm"
              >
                <CircleHelp size={16} /> Add Gemini key
              </Link>
            )}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--color-muted)]">
              <Bell size={16} />
              Queue {status.queue.queued + status.queue.running}
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-white/62">
              <div className="flex justify-between text-xs text-[var(--color-muted)]">
                <span>Daily budget</span>
                <span>
                  {status.budget.used}/{status.budget.limit}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#e7ede2] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand)]"
                  style={{
                    width: `${Math.min(
                      100,
                      status.budget.limit ? (status.budget.used / status.budget.limit) * 100 : 0,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-auto p-4">
        <div className="soft-panel p-4">
          <div className="text-sm font-semibold">Intent signals</div>
          <p className="mt-1 text-xs text-[var(--color-brand-deep)]/75">
            Evidence-backed CRM buying cycles with cached research and SDR feedback.
          </p>
        </div>
      </div>
    </aside>
  );
}
