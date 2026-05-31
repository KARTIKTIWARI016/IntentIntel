import assert from "node:assert";
import { scoreCompany, decayFactor } from "../src/lib/scoring";
import type { AppConfig } from "../src/lib/config";
import type { ModelOutput } from "../src/lib/contract";

const config: AppConfig = {
  ourCrmName: "OUR_CRM",
  competitors: ["Salesforce", "HubSpot"],
  intentDef: "test",
  recencyDays: 30,
  decayHalfLife: 15,
  signalWeights: {
    competitor_displacement: 1.0,
    procurement_rfp: 1.0,
    active_research: 0.8,
    hiring: 0.6,
  },
  geminiModel: "gemini-2.5-flash",
};

function model(signals: ModelOutput["signals"], inMarket = false): ModelOutput {
  return {
    firmographics: { techStack: [] },
    signals,
    buyingStageRationale: "",
    summary: "",
    inMarketForCrm: inMarket,
  };
}

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("scoring engine");

check("no signals → score 0, stage unaware, confident", () => {
  const r = scoreCompany(model([]), config);
  assert.equal(r.intentScore, 0);
  assert.equal(r.buyingStage, "unaware");
  assert.ok(r.confidence >= 60);
});

check("decay is 1 at age 0 and 0.5 at one half-life", () => {
  assert.equal(decayFactor(0, 15, 30), 1);
  assert.ok(Math.abs(decayFactor(15, 15, 30) - 0.5) < 1e-9);
});

check("signals outside recency window contribute nothing", () => {
  assert.equal(decayFactor(45, 15, 30), 0);
  const r = scoreCompany(
    model([
      { category: "competitor_displacement", strength: 100, evidenceQuote: "old", ageDays: 60 },
    ]),
    config,
  );
  assert.equal(r.intentScore, 0);
});

check("strong fresh procurement signal → decision stage", () => {
  const r = scoreCompany(
    model([
      { category: "procurement_rfp", strength: 90, evidenceQuote: "RFP for CRM", ageDays: 2 },
    ]),
    config,
  );
  assert.ok(r.intentScore > 0);
  assert.equal(r.buyingStage, "decision");
});

check("multiple corroborating signals score higher than one", () => {
  const one = scoreCompany(
    model([{ category: "hiring", strength: 70, evidenceQuote: "CRM admin role", ageDays: 5 }]),
    config,
  ).intentScore;
  const many = scoreCompany(
    model([
      { category: "hiring", strength: 70, evidenceQuote: "CRM admin role", ageDays: 5 },
      { category: "active_research", strength: 70, evidenceQuote: "G2 visit", ageDays: 5 },
      { category: "competitor_displacement", strength: 70, evidenceQuote: "alt search", ageDays: 5 },
    ]),
    config,
  ).intentScore;
  assert.ok(many > one, `expected ${many} > ${one}`);
});

check("confidence rewards cited, diverse, fresh evidence", () => {
  const low = scoreCompany(
    model([{ category: "hiring", strength: 50, evidenceQuote: "x", ageDays: 25 }]),
    config,
  ).confidence;
  const high = scoreCompany(
    model([
      { category: "hiring", strength: 50, evidenceQuote: "x", sourceUrl: "https://a.com", sourceType: "job_board", ageDays: 2 },
      { category: "active_research", strength: 50, evidenceQuote: "y", sourceUrl: "https://b.com", sourceType: "review_site", ageDays: 3 },
    ]),
    config,
  ).confidence;
  assert.ok(high > low, `expected ${high} > ${low}`);
});

console.log(`\n${passed} checks passed.`);
