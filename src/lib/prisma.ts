import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

// Reuse a single PrismaClient across hot-reloads / lambda invocations.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; sqliteReady?: boolean };

function sqlitePathFromUrl(url: string): string {
  if (!url.startsWith("file:")) return url;
  return url.replace(/^file:/, "");
}

function ensureSqliteSchema(url: string) {
  if (globalForPrisma.sqliteReady) return;
  const db = new Database(sqlitePathFromUrl(url));
  db.pragma("foreign_keys = ON");
  db.exec(`
CREATE TABLE IF NOT EXISTS Company (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  industry TEXT,
  employeeCount TEXT,
  revenueEstimate TEXT,
  existingCrm TEXT,
  techStack TEXT,
  firstSeen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastAnalyzedAt DATETIME
);
CREATE INDEX IF NOT EXISTS Company_domain_idx ON Company(domain);

CREATE TABLE IF NOT EXISTS AnalysisRun (
  id TEXT NOT NULL PRIMARY KEY,
  companyId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete',
  intentScore INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 0,
  buyingStage TEXT NOT NULL DEFAULT 'unaware',
  summary TEXT,
  rawModelOutput TEXT,
  groundingSources TEXT,
  errorMessage TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME NOT NULL,
  CONSTRAINT AnalysisRun_companyId_fkey FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS AnalysisRun_companyId_createdAt_idx ON AnalysisRun(companyId, createdAt);

CREATE TABLE IF NOT EXISTS Signal (
  id TEXT NOT NULL PRIMARY KEY,
  analysisRunId TEXT NOT NULL,
  category TEXT NOT NULL,
  strength INTEGER NOT NULL,
  ageDays INTEGER NOT NULL DEFAULT 0,
  decayedWeight REAL NOT NULL DEFAULT 0,
  evidenceQuote TEXT NOT NULL,
  sourceUrl TEXT,
  sourceType TEXT,
  detectedDate TEXT,
  CONSTRAINT Signal_analysisRunId_fkey FOREIGN KEY (analysisRunId) REFERENCES AnalysisRun(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS Signal_analysisRunId_idx ON Signal(analysisRunId);

CREATE TABLE IF NOT EXISTS OutreachDraft (
  id TEXT NOT NULL PRIMARY KEY,
  analysisRunId TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'consultative',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT OutreachDraft_analysisRunId_fkey FOREIGN KEY (analysisRunId) REFERENCES AnalysisRun(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Feedback (
  id TEXT NOT NULL PRIMARY KEY,
  analysisRunId TEXT NOT NULL UNIQUE,
  verdict TEXT NOT NULL,
  note TEXT,
  userId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Feedback_analysisRunId_fkey FOREIGN KEY (analysisRunId) REFERENCES AnalysisRun(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Job (
  id TEXT NOT NULL PRIMARY KEY,
  type TEXT NOT NULL,
  batchId TEXT,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  maxAttempts INTEGER NOT NULL DEFAULT 3,
  resultRunId TEXT,
  errorMessage TEXT,
  scheduledFor DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  startedAt DATETIME,
  finishedAt DATETIME
);
CREATE INDEX IF NOT EXISTS Job_status_scheduledFor_idx ON Job(status, scheduledFor);
CREATE INDEX IF NOT EXISTS Job_batchId_idx ON Job(batchId);

CREATE TABLE IF NOT EXISTS Dossier (
  id TEXT NOT NULL PRIMARY KEY,
  companyId TEXT,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  markdown TEXT NOT NULL,
  sources TEXT,
  queries TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS Dossier_domain_createdAt_idx ON Dossier(domain, createdAt);

CREATE TABLE IF NOT EXISTS Batch (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Config (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
  ourCrmName TEXT NOT NULL DEFAULT 'OUR_CRM',
  competitors TEXT NOT NULL DEFAULT '["Salesforce","HubSpot","Zoho CRM","Pipedrive","Microsoft Dynamics 365","Freshsales"]',
  intentDef TEXT NOT NULL DEFAULT 'A company shows buying intent if, within the last 30 days, public signals indicate it is actively researching, comparing, hiring for, or procuring CRM software - suggesting it is in or about to enter a CRM buying cycle.',
  recencyDays INTEGER NOT NULL DEFAULT 30,
  decayHalfLife INTEGER NOT NULL DEFAULT 15,
  signalWeights TEXT NOT NULL DEFAULT '{"competitor_displacement":1.0,"procurement_rfp":1.0,"active_research":0.8,"hiring":0.6}',
  geminiModel TEXT NOT NULL DEFAULT 'gemini-3-flash-preview',
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS User (
  id TEXT NOT NULL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
  db.prepare("INSERT OR IGNORE INTO Config (id) VALUES ('singleton')").run();
  db.prepare(
    "UPDATE Config SET geminiModel = 'gemini-3-flash-preview' WHERE geminiModel = 'gemini-2.5-flash'",
  ).run();
  db.close();
  globalForPrisma.sqliteReady = true;
}

function createClient(): PrismaClient {
  // Prisma 7 requires a driver adapter. better-sqlite3 for local; swap the
  // adapter (and DATABASE_URL) for Postgres when deploying to the VM.
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  ensureSqliteSchema(url);
  const adapter = new PrismaBetterSqlite3({
    url,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
