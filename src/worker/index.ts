import "dotenv/config";
import { analyzeCompany } from "@/lib/intent";
import {
  claimNextJob,
  markJobDone,
  markJobFailedOrRetry,
  deferJobToTomorrow,
  budgetStatus,
} from "@/lib/queue";

const RPM = Math.max(1, Number(process.env.WORKER_RPM ?? "8"));
const MIN_INTERVAL_MS = Math.ceil(60_000 / RPM);
const IDLE_POLL_MS = 4_000;

let running = true;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tick(): Promise<"worked" | "idle" | "deferred"> {
  const job = await claimNextJob();
  if (!job) return "idle";

  // Respect the free-tier daily budget — defer overflow to tomorrow.
  const budget = await budgetStatus();
  if (budget.overBudget) {
    await deferJobToTomorrow(job.id);
    console.log(
      `[worker] daily budget reached (${budget.used}/${budget.limit}); deferred job ${job.id} to next UTC day.`,
    );
    return "deferred";
  }

  let payload: { name: string; url: string };
  try {
    payload = JSON.parse(job.payload);
  } catch {
    await markJobFailedOrRetry(job.id, "Invalid job payload JSON");
    return "worked";
  }

  try {
    const report = await analyzeCompany(payload.name, payload.url);
    await markJobDone(job.id, report.runId);
    console.log(
      `[worker] ${report.cached ? "cache" : "live"} → ${payload.name} = ${report.intentScore} (${report.buyingStage})`,
    );
    return report.cached ? "idle" : "worked"; // throttle only on real API calls
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobFailedOrRetry(job.id, msg);
    console.error(`[worker] job ${job.id} error: ${msg}`);
    return "worked";
  }
}

async function main() {
  console.log(`[worker] started — ${RPM} req/min (≥${MIN_INTERVAL_MS}ms between live calls).`);
  while (running) {
    let result: Awaited<ReturnType<typeof tick>>;
    try {
      result = await tick();
    } catch (err) {
      console.error("[worker] tick failed:", err);
      result = "idle";
    }
    if (result === "worked") await sleep(MIN_INTERVAL_MS);
    else await sleep(IDLE_POLL_MS);
  }
}

function shutdown() {
  console.log("\n[worker] shutting down…");
  running = false;
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
