# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A demo data lake platform for a fictional juice distributor. Synthetic sales/product/store data flows into PostgreSQL + MinIO, is queried federated via Trino, and a Next.js app exposes a chat interface that answers business questions in Portuguese (natural language → SQL → formatted answer) plus a KPI dashboard.

## Commands

All commands are run from the repo root via `Makefile` unless noted.

```bash
make up              # Start Docker infra (postgres, minio, trino) — waits for healthchecks
make down             # Stop infra
make restart          # down + up
make generate         # Install deps + run synthetic data generator (products, stores, sales)
make dev              # Install web deps + start Next.js dev server (localhost:3000)
make build            # Build the Next.js app
make test             # Run web/tests/src/validate.ts (sanity checks against live data)
make test-data        # Print row counts from Postgres (products/stores/sales/revenue)
make test-trino       # Run a sample federated query directly against Trino
make ollama-up        # Start the optional local-LLM Ollama container
make ollama-pull      # Pull the qwen2.5:3b model into the running Ollama container
```

Inside `web/` (Next.js app):

```bash
npm run dev            # next dev
npm run build           # next build
npm run typecheck       # tsc --noEmit
npm run lint            # next lint
npm run test            # cd tests && npx tsx src/validate.ts
npm run migrate         # node scripts/migrate.js — applies web/migrations/*.sql to Postgres
npm run migrate:status  # node scripts/migrate.js --status
```

Inside `data-generator/`:

```bash
npm run generate    # tsx src/generate.ts — wipes/reseeds Postgres + writes Parquet to MinIO
npm run typecheck
```

There is no single-test runner — `validate.ts` is a script that runs a fixed battery of checks against a running stack (Docker infra + generated data must be up first).

## Architecture

### Data flow
1. **`data-generator/`** (standalone TS/Node script, not part of the web app) seeds Postgres with 2 years of synthetic data (products, stores, representatives, sales, returns, routes — see `src/seeds/`), then `export.ts` exports historical data to MinIO as partitioned Parquet.
2. **Trino** (`docker/trino/etc/catalog/`) federates queries across the `postgresql` catalog (live transactional tables) and a Hive-backed catalog over MinIO Parquet — this is why SQL in the app is written as `postgresql.public.sales` etc., and only ever needs to hit one catalog today (MinIO/Hive path exists but isn't the primary query path).
3. **`web/`** (Next.js 14 App Router) is the only app that talks to Trino at runtime, via `web/src/lib/trino.ts`. That module hard-blocks any non-SELECT/SHOW/DESCRIBE/EXPLAIN/WITH statement — this is the actual SQL-injection safety boundary since chat questions influence which SQL runs.

### Chat pipeline (`web/src/app/api/chat/route.ts`)
Three engines run in a cascade, cheapest/most-deterministic first:
1. **Template matching** (`template-matcher.ts` + `question-templates.ts`) — regex patterns and keyword scoring match a question to one of ~40 predefined `QuestionTemplate`s with parameterized SQL (region/category/period/metric placeholders resolved via `resolveSQL`). This is free, deterministic, and covers ~90% of questions with zero hallucination risk. Confidence is `high`/`medium`/`low` based on match score.
2. **Ollama** (`ollama-translator.ts`, local qwen2.5:3b, optional/free) — used to *format* high-confidence template results into prose, and as a fallback SQL translator for low-confidence matches. Only activates if `isOllamaAvailable()` succeeds; the docker-compose `ollama` service is commented out by default (opt-in, downloads ~2GB model on first start).
3. **OpenAI** (`nl-to-sql.ts`, paid, requires `OPENAI_API_KEY`) — last-resort NL→SQL translation, dynamically imported only when reached.

Regardless of which engine answers, `executeQuery()` in `trino.ts` is the only path to the database, so the safety checks there apply uniformly.

`formatTemplateResponse()` in `route.ts` contains a large DB-column → Portuguese-label map (`labelMap`) used to render markdown tables/summaries — when adding a new template with new output columns, add the column's label here too or it'll fall back to the raw column name.

### Dashboard (`web/src/app/api/dashboard/route.ts`)
Independent of the chat pipeline. Runs fixed KPI queries directly against Trino. Note the reference date is hardcoded (`DATE '2025-12-01'`) because the synthetic dataset only covers a fixed historical window — update this if regenerating data with a different date range.

### Adding a new business question
New questions belong in `web/src/lib/question-templates.ts` as a `QuestionTemplate` (patterns, parameterized SQL, category, description) — not as ad-hoc logic in the route handler. `docs/BUSINESS_QUESTIONS.md` documents the business intent behind the template categories.

### Migrations
`web/migrations/*.sql` are plain numbered SQL files applied by `web/scripts/migrate.js` (custom runner, no external migration framework). This is separate from `docker/postgres/init.sql`, which only bootstraps the container on first run.

### Fine-tuning pipeline (optional, experimental)
`web/scripts/{export_to_ollama,prepare_dataset,train_juice_model,verify_answers}.py` implement an offline LoRA fine-tuning flow that turns collected chat feedback (`web/src/app/api/feedback/route.ts` logs to `web/feedback-log.json`) plus the question templates into a specialized Ollama model. See `docs/FINE_TUNING.md` for the full flow; this is disconnected from the main request path unless a fine-tuned model is deployed to Ollama.

### Deployment
Deployed to Railway (project `juice-datalake`, public GitHub repo `Andersonfrfilho/juice-datalake`) as three GitHub-linked services, each redeploying automatically on push to `main`:
- **Postgres** — Railway managed database (`ghcr.io/railwayapp-templates/postgres-ssl:18`).
- **Trino** — built from `docker/trino/railway/Dockerfile` (repo root as build context), reads Postgres connection details into `catalog/postgresql.properties` via Railway's `${{ Postgres.PGHOST }}`-style variable references. Reachable from `web` only over the private network at `http://trino.railway.internal:8080`.
- **web** — built from `web/Dockerfile`. The container's `CMD` is `web/docker-entrypoint.sh` (`node scripts/migrate.js` then `exec node server.js`) — this chain must live inside a script with its own `#!/bin/sh` shebang rather than as a `startCommand: "a && b"` string, because Railway does not reliably shell-interpret `startCommand` and a bare `&&` string can silently run only the first command. Full `node_modules` (not just Next's `standalone` trace) plus `scripts/` and `migrations/` are copied into the runner image since `migrate.js` and its `pg` dependency aren't part of the Next.js server's own dependency trace.

This preserves the full Postgres+Trino architecture unchanged from local dev — no Postgres-direct fallback path exists or is needed. The chat engine is templates-only in this deployment (no `OLLAMA_URL`/`OPENAI_API_KEY` set); see `.env.railway` for the variable reference used across the three services. Demo data is seeded by running `data-generator` locally against Railway's Postgres via its TCP proxy connection string (`PG_HOST`/`PG_PORT`/etc pointed at `DATABASE_PUBLIC_URL`'s host/port) — MinIO export in that script can be pointed at a scratch local MinIO container since Hive/MinIO isn't deployed on Railway and that part of the output is discarded.
