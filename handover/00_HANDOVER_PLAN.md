# Handover Plan — ai-crm (CRM + Logistics + SETU)

**Assignment:** Full System Handover & Knowledge Transfer (Shashank Mishra)
**System covered by this folder:** the CRM + Logistics + SETU repository, per `ECOSYSTEM_REPOSITORY_MAP.md` — this repository contains **two independent backends**, a shared frontend, and the SETU ingestion module.
**Recipients this must satisfy without further clarification:** Vijay Dhawan, Isha Singh, Soham Kotkar
**Prepared:** July 2026 · **Method:** static code analysis + live command-line testing inside a sandboxed copy of this repository (full detail in `13_EVIDENCE_PACKET.md`)

---

## 1. The most important thing to understand before reading anything else

**This repository contains two genuinely separate backend applications that share one MongoDB database:**

| | `backend/` (Python) | `backend-nodejs/` (Node.js) |
|---|---|---|
| Framework | FastAPI | Express |
| Serves | SETU integration, customer portal, procurement, AI/LLM features, 3 Streamlit analytics dashboards | The main React frontend's day-to-day CRM/logistics operations (18 of the frontend's API service files point here) |
| Port (default) | 8000 | 8000 — **same port, verified collision, see Known Issues** |
| Auth header | `Authorization: Bearer <token>` for most; SETU routes use their own key | `Authorization: Bearer <token>` |
| Database | MongoDB Atlas `cluster0.7c16heb.../ai_crm_logistics` | **Same cluster, same database** — verified identical connection string |

These are not a "legacy vs. current" pair or a "primary vs. fallback" pair — they're two independently-maintained systems serving different consumers, that happen to share a database. Per the user's original request, each gets its own dedicated source-code-walkthrough and API-documentation file (`03a`/`03b`, `06a`/`06b`) in addition to the documents that necessarily cover both together (architecture, database, deployment, known issues).

## 2. How to read this folder

| # | File | Answers the question |
|---|---|---|
| 00 | `00_HANDOVER_PLAN.md` | You are here |
| 01 | `01_EXECUTIVE_OVERVIEW.md` | What is ai-crm, what is SETU's role here, status, readiness |
| 02 | `02_ARCHITECTURE_GUIDE.md` | How both backends + frontend + SETU fit together |
| 03a | `03a_BACKEND_PYTHON_WALKTHROUGH.md` | Source code map for `backend/` (FastAPI + SETU) |
| 03b | `03b_BACKEND_NODEJS_WALKTHROUGH.md` | Source code map for `backend-nodejs/` (Express) |
| 04 | `04_DEPLOYMENT_GUIDE.md` | How to stand up both backends + frontend |
| 05 | `05_DATABASE_GUIDE.md` | The shared database, both backends' schemas, the overlap risk |
| 06a | `06a_API_DOCUMENTATION_PYTHON_BACKEND.md` | Every endpoint in `backend/` |
| 06b | `06b_API_DOCUMENTATION_NODEJS_BACKEND.md` | Every endpoint in `backend-nodejs/` |
| 07 | `07_KNOWN_ISSUES_REGISTER.md` | What's broken, unfinished, or risky — including a port collision and shared-DB risk |
| 08 | `08_OPERATIONS_RUNBOOK.md` | Deploy, restart, recover, logs, troubleshooting |
| 09 | `09_DEPENDENCY_MAP.md` | Internal, external, and cross-repo dependencies (including a confirmed live link to workflow-blackhole) |
| 10 | `10_REPOSITORY_INVENTORY.md` | Branches, commits, ecosystem repo list |
| 11 | `11_CREDENTIALS_CONFIGURATION_REGISTER.md` | Where secrets live (no values) |
| 12 | `12_REVIEW_PACKET.md` | Condensed sign-off summary, reconciled against this repo's extensive pre-existing SETU audit trail |
| 13 | `13_EVIDENCE_PACKET.md` | Every command run and its real output |
| 14 | `14_EXECUTIVE_ASSESSMENT.md` | Maturity, risk, recommended next steps |

## 3. Deliverable coverage map

| Task deliverable | Where it's covered |
|---|---|
| 1. Executive Overview | `01` |
| 2. Complete Architecture Documentation | `02` |
| 3. Source Code Walkthrough | `03a` (Python backend), `03b` (Node backend) |
| 4. Production Infrastructure | `04` |
| 5. Database Documentation | `05` |
| 6. API Documentation | `06a`, `06b` |
| 7. Known Issues Register | `07` |
| 8. Operational Runbook | `08` |
| 9. Dependency Map | `09` |
| 10. Repository Inventory | `10` |
| 11. Credentials & Configuration Register | `11` |
| 12. Demonstration Session | Not producible by static analysis — outline provided in §5 below |
| 13. Documentation Package | All of the above, together |
| 14. Executive Assessment | `14` |
| 15. Mandatory Evidence | `13`, plus a checklist of what needs live access |

## 4. Method — how "tested and verified" was actually done for this repository

- Both backends' full dependency sets were **actually installed** — `pip install -r requirements.txt` into a clean virtualenv (135 Python files), and `npm install` for the Node backend (28 files) — not assumed to work.
- Every one of the 135 Python files and 28 JavaScript files was **individually syntax-checked** (`py_compile` / `node --check`).
- Both backends were **actually started** and their real startup logs captured — including catching that the Python backend's "Connected to MongoDB" log line is printed before any real connectivity is verified (a misleading-log-message finding caught by testing the actual behavior, not by trusting the log).
- The **existing pytest suite was run** — 2 of 4 test files fail to even collect (a real, reproducible `ModuleNotFoundError`), and a third test was found to hang — reported honestly rather than glossed over.
- The **frontend was built** (`npm run build`) and its actual API base URL configuration was traced to determine which backend it really talks to, rather than assuming from folder names or documentation.
- The **API surface of both backends was extracted directly from source** (script-based, not hand-typed) — 112 Python endpoints, 70 Node endpoints.
- This repository already contains an extensive, dated (2026-07-04) SETU-specific audit trail (`SETU Ownership Transition__ Phase II (Post-Handover Audit)/`, `CONVERGENCE_GAPS.md`, and related proof documents). Rather than duplicate that work, several of its specific claims (e.g. `GAP-001` through `GAP-006`) were **independently re-checked against the current code** to confirm which are still open and which have since been fixed — two were found already resolved, one was found still open (matching this handover's own independent finding), and the rest are flagged for the same re-verification treatment.
- A pre-existing claim in the repo root `HANDOVER.md` and the `ECOSYSTEM_REPOSITORY_MAP.md` — that Logistics has "no separate backend" — was checked directly against the code and found to need clarification: see `01_EXECUTIVE_OVERVIEW.md` and `09_DEPENDENCY_MAP.md`.

## 5. What still needs a human with production access

1. **Demonstration session recording** (task item 12). Suggested outline:
   - 0:00 Executive Overview — the two-backend, one-database architecture (the single most important thing to convey)
   - 8:00 SETU module walkthrough — its role, its endpoints, its relationship to Sampada
   - 16:00 Deployment — both backends' real deploy paths, including the confirmed-missing `start_server.py`
   - 24:00 Known issues — the shared-database schema risk and the port collision, specifically
   - 32:00 Live API walkthrough against the running production backends
2. **Live screenshots**: MongoDB Atlas collection browser (to visually confirm the shared-database finding), both backends' production health checks, any hosting-platform (Render/Railway) dashboard showing both services running.
3. **Confirmation from whoever owns the deployment** of which backend(s) are actually live in production right now — this package documents what the code says should happen, not a live-observed production state (no network path to Atlas or any hosting platform from this sandbox — see `13_EVIDENCE_PACKET.md`).
