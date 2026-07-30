# Executive Overview — ai-crm (CRM + Logistics + SETU)

## What this system is

Per `ECOSYSTEM_REPOSITORY_MAP.md`, this repository is the home of three things at once: **CRM** (relationship intelligence), **Logistics** (inventory/order/supplier management), and the **SETU module** (this system's participation in the TANTRA ecosystem's ingestion/lineage layer). Concretely, it is: one React frontend, **two independent backends**, and a MongoDB Atlas database shared by both.

## The two backends — read this before anything else

This is the single most important structural fact about this repository, and it isn't obvious from the ecosystem map's one-line summary ("Logistics: frontend, no separate backend"). Direct code inspection shows this needs a correction: **there is a separate backend for logistics** — it just isn't the Python one.

- **`backend/` (Python/FastAPI, 135 files):** hosts the SETU module (20 endpoints — sovereign routing, lineage/telemetry, signal ingestion, direct Niyantran/workflow-blackhole integration hooks, bucket verification), a customer-facing portal, procurement workflows, LLM/AI query features, and three separate Streamlit analytics dashboards (CRM dashboard, main dashboard, product catalog dashboard). 86 more endpoints live directly in its main `api_app.py`.
- **`backend-nodejs/` (Express, 28 files):** a self-described "Logistics & Inventory... backend" — auth, users, products, orders, inventory, restock requests, suppliers, EMS, reinforcement-learning-based decisions, AI decisions, and an LLM query passthrough. 70 endpoints across 12 route files, all actively mounted.
- **Verified: the main React frontend's primary backend is `backend-nodejs`, not the Python backend.** 18 of the frontend's `src/services/api/*.js` files import a single Axios client (`baseAPI.js`) that defaults to `http://localhost:8000` — `backend-nodejs`'s default port. The Python backend is reached by different consumers: SETU's external callers, the customer portal, and the Streamlit dashboards — not the main day-to-day CRM UI.
- **Verified: both backends connect to the exact same MongoDB Atlas database** (`cluster0.7c16heb.../ai_crm_logistics`, same credentials) — confirmed by comparing both `.env` files directly. The Python backend's own database layer directly reads/writes `.products`, `.orders`, `.inventory`, and `.suppliers` collections — the same collection names the Node backend's Mongoose models use. See `05_DATABASE_GUIDE.md` for the full implication of this.

Treat this as two backends that must each be understood on their own terms (hence the separate `03a`/`03b` and `06a`/`06b` documents in this package), not as a legacy/current pair.

## Purpose of SETU (as implemented in this repository)

SETU's job here is to let this system participate in the wider TANTRA ecosystem's execution/lineage/governance flow described in `ECOSYSTEM_REPOSITORY_MAP.md`. Concretely, the `setu/` module (16 files) provides: sovereign request routing, per-trace lineage and telemetry retrieval, signal ingestion, direct integration endpoints for Niyantran (workflow-blackhole) task/submission/execution state, contract validation, Bucket artifact verification, and a set of UI-visibility endpoints used by dashboards to show execution state. This repository's SETU implementation is one of the two places SETU code lives (the other being inside Sampada's own gateway, per the ecosystem map) — they are not the same code, but are meant to speak a compatible contract.

## Purpose of NIYANTRAN, for context

Niyantran itself lives in the separate `workflow-blackhole` repository (see that repo's own `handover/` package). This repository's relationship to it is as an integration partner: `setu/niyantran_integration_adapter.py` and the `/setu/niyantran/*` endpoints exist specifically to exchange task/submission/execution state with Niyantran, and — independently confirmed — the React **frontend itself makes direct browser-side calls to Niyantran's live production API** (`https://blackholeworkflow.onrender.com/api`, hardcoded as the default in `src/pages/Infiverse.jsx`), for a dashboard view. This is a real, live, verified cross-repository dependency, not just a documented intention.

## Current implementation status

| Area | Status | Basis |
|---|---|---|
| Node backend (`backend-nodejs`) | Complete and running | Boots successfully, all 28 files syntax-clean, all 70 endpoints verified mounted |
| Python backend (`backend`) | Mostly complete, one confirmed production-deploy blocker | Boots and imports cleanly; `Procfile` points at a file that doesn't exist (see Known Issues) |
| SETU module | Implemented, previously audited | 20 endpoints; a prior dated audit (2026-07-04) found 6 critical blockers — re-verification here shows 2 already fixed, 1 still open, others need re-check (see Known Issues) |
| Frontend | Complete and building | `npm run build` succeeds |
| Automated test coverage | Partial | Node backend has no test suite found; Python backend's pytest suite: 2 of 4 files fail to even collect (missing module), 1 test hangs |
| Customer portal | Implemented | 6 endpoints, included in the Python backend |
| Streamlit dashboards | Present, 3 separate apps | Not part of the main React frontend; separate ports/processes |

## Overall architecture (one paragraph)

A single React SPA talks primarily to the Node.js backend for day-to-day CRM/logistics operations, and separately (for SETU/customer-portal/AI features) to the Python backend — both ultimately reading and writing the same MongoDB Atlas database. The Python backend additionally serves three standalone Streamlit dashboards and exposes the SETU integration surface, including live calls out to workflow-blackhole (Niyantran). Full detail in `02_ARCHITECTURE_GUIDE.md`.

## Production readiness — direct assessment

**Partially production-ready, with one confirmed deploy-breaking issue and one significant architectural risk to be aware of.**

- The Node backend is solid: clean install, clean boot, all endpoints mounted, no syntax issues.
- The Python backend's `Procfile` (used by Heroku/Railway-style platforms) points at `start_server.py`, **which does not exist anywhere in the repository** — confirmed by direct file search. Any deploy relying on this `Procfile` will fail immediately. The repo's `Dockerfile` correctly uses `uvicorn api_app:app` instead, so Docker-based deploys are unaffected — but this is exactly the kind of thing that should be caught before a platform migration, not during one.
- Both backends writing to the same MongoDB collections is a real architectural risk (not necessarily a bug today, but worth deliberate design attention — see Known Issues) — schema drift between the Python data layer's dynamic dict-based writes and the Node backend's strict Mongoose schemas could silently corrupt data for the other backend.
- The **default ports collide**: both backends default to `8000`. Confirmed in both `.env` files, both explicitly set to `PORT=8000`/`API_PORT=8000`. They cannot run simultaneously on one machine without one of them being reconfigured.

## Known limitations (summary — see 07 for full register)

- `Procfile` references a missing `start_server.py` (confirmed, deploy-breaking on Heroku/Railway-style platforms).
- Port collision between both backends' defaults.
- Two of four Python test files fail to even collect due to a missing `chatbot_agent` module.
- Prior SETU audit found 6 critical gaps; 2 confirmed fixed since, 1 confirmed still open, remainder need re-verification.
- Both backends share database collections without a clearly enforced single-writer boundary.

## Who owns this

**System Owner (per source task):** Shashank Mishra
**Handover acceptance authority (per ecosystem map):** Rishabh Yadav
**SETU-specific prior audit trail** exists in this repo at `SETU Ownership Transition__ Phase II (Post-Handover Audit)/` (dated 2026-07-04) — read alongside this package, not instead of it; this package independently re-verifies rather than assumes its findings are still current.
