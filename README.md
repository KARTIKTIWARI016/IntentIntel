# IntentIntel

A 6sense-style **CRM buying-intent detection** platform. Give it a company **name + URL**;
it researches the public web with **Gemini + Google Search grounding** and returns a scored,
evidence-backed report on whether the company is entering a CRM buying cycle.

Built for a company that **sells its own CRM**, targeting **SMB + mid-market Tech/SaaS** across
**North America, EU/UK, and India/APAC**. North-star metric: **SDR acceptance rate**.

## What it does

- **Single lookup** — type a company + website, get an intent report in ~20–60s.
- **Bulk** — upload/paste a CSV (`name,url`); companies are queued and processed within the
  free-tier rate limit.
- **Hybrid scoring** — Gemini extracts cited signals; transparent, age-decayed weighted rules
  produce a 0–100 **intent score** + **confidence** + **buying stage**.
- **Four signal categories** (30-day window, gradual decay): competitor displacement, hiring,
  active research, procurement/RFP.
- **Evidence-first** — every signal carries a verbatim quote + source URL; grounding citations
  are stored too.
- **Outreach draft** — a personalized message built from the strongest signals.
- **Feedback loop** — Accept/Reject + notes per report; the Metrics page tracks acceptance rate.
- **Free-tier aware** — 30-day per-company cache (repeat lookups cost nothing) + a daily budget
  with overflow queued to the next day.
- **Company-level only** — no named individuals are stored (GDPR-light).

## Quick start (local)

```bash
npm install
cp .env.example .env        # then set GEMINI_API_KEY
npm run db:push             # create the SQLite schema
npm run db:seed             # seed the config row

npm run dev                 # web app at http://localhost:3000
npm run worker              # (second terminal) drains the bulk queue
```

Get a free Gemini API key at https://aistudio.google.com/apikey and paste it into `.env`.

- The **single Analyze** page works without the worker (it runs synchronously).
- The **worker** is only needed to process **bulk** uploads and budget-deferred overflow.

## Configuration

Edit in the **Settings** page (or `PUT /api/config`):

| Setting | Default | Meaning |
|---|---|---|
| `ourCrmName` | `OUR_CRM` | **Set this to your real CRM product name.** |
| `competitors` | Salesforce, HubSpot, Zoho… | Used to detect displacement intent. |
| `intentDef` | (provided) | The definition the model reasons against. |
| `recencyDays` | 30 | Only signals this fresh count. |
| `decayHalfLife` | 15 | Days; gradual exponential decay. |
| `signalWeights` | displacement/RFP=1.0, research=0.8, hiring=0.6 | Per-category weights. |
| `geminiModel` | `gemini-2.5-flash` | Grounded model. |

Env (`.env`): `GEMINI_API_KEY`, `WORKER_RPM` (default 8), `DAILY_API_BUDGET` (default 200).

## API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/analyze` | `{name,url,forceRefresh?}` → report (or queued if over budget) |
| GET | `/api/analyze/:runId` | fetch a stored report |
| POST | `/api/bulk` | `{items:[{name,url}]}` → `{batchId}` |
| GET | `/api/bulk/:batchId` | batch progress + ranked results |
| POST | `/api/feedback` | `{runId,verdict,note}` |
| GET | `/api/metrics` | acceptance rate, stage mix, budget |
| GET/PUT | `/api/config` | read/update settings |
| GET | `/api/status` | budget + queue + key status |

## Tests

```bash
npm run test:scoring        # unit tests for the scoring/decay engine
```

## Architecture

```
Next.js (App Router) UI
  └─ API routes (/api/*)            runtime: node
       └─ lib/intent.ts             cache check → analyze → persist
            ├─ lib/gemini.ts        Gemini 2.5 Flash + googleSearch grounding → JSON
            ├─ lib/scoring.ts       hybrid weighted + age-decay → score/confidence/stage
            └─ lib/outreach.ts      templated outreach from top signals
  └─ worker (lib/queue.ts)          free-tier throttle + daily budget + retries
  └─ Prisma + SQLite (better-sqlite3 adapter)
```

## Deploying to the Korcomptenz VM (later)

1. **Switch DB to Postgres**: change `datasource db { provider = "postgresql" }` in
   `prisma/schema.prisma`, set `DATABASE_URL` to the VM Postgres, and swap the adapter in
   `src/lib/prisma.ts` to `@prisma/adapter-pg` (the rest of the code is unchanged).
2. **Or keep SQLite** for a small team using the provided `docker-compose.yml` (web + worker
   share a data volume).
3. Build & run: `docker compose up -d --build`, then put the `web` service behind the shared
   Nginx on the staging/production VM (see the internal VM deployment brief).

## Notes & limitations

- Free-tier Gemini + grounding realistically handles **dozens of fresh analyses/day**; the cache
  and queue stretch this. Raise `DAILY_API_BUDGET` / `WORKER_RPM` (and use a paid key) for more.
- Signal coverage depends on what Google Search surfaces; some sources (e.g. LinkedIn) are limited
  by their terms. The platform never scrapes directly — it reasons over grounded search results.
- `ourCrmName` ships as a placeholder — **set it in Settings before real use.**
