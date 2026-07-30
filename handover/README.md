# ai-crm (CRM + Logistics + SETU) — Handover Documentation

This folder is a complete, code-verified handover package for the ai-crm system, prepared as part of the "Full System Handover & Knowledge Transfer" assignment. Start with `00_HANDOVER_PLAN.md`.

## Quick facts

- **What:** CRM + Logistics + SETU, per `ECOSYSTEM_REPOSITORY_MAP.md` — but with a two-backend architecture the map's one-line summary doesn't capture
- **Stack:** React (frontend) / **two independent backends** — FastAPI (`backend/`) and Express (`backend-nodejs/`) — / MongoDB Atlas (shared by both)
- **Status:** functionally complete, three verified production-deployment blockers in the Python backend, no CI/CD
- **🔴 Read this first:** the two-backend architecture (`01_EXECUTIVE_OVERVIEW.md`) and the shared-database schema divergence (`05_DATABASE_GUIDE.md` §1)

## Contents

| File | Contents |
|---|---|
| `00_HANDOVER_PLAN.md` | The two-backend architecture explained, deliverable mapping, methodology |
| `01_EXECUTIVE_OVERVIEW.md` | What ai-crm is, SETU's role, status, readiness |
| `02_ARCHITECTURE_GUIDE.md` | System diagram covering both backends + frontend + SETU + Niyantran integration |
| `03a_BACKEND_PYTHON_WALKTHROUGH.md` | `backend/` — 135 files, SETU, customer portal, dashboards |
| `03b_BACKEND_NODEJS_WALKTHROUGH.md` | `backend-nodejs/` — 28 files, the frontend's real backend |
| `04_DEPLOYMENT_GUIDE.md` | Both backends' deployment, including 3 conflicting Python deploy paths |
| `05_DATABASE_GUIDE.md` | The shared database and the confirmed schema divergence between backends |
| `06a_API_DOCUMENTATION_PYTHON_BACKEND.md` | All 112 Python endpoints |
| `06b_API_DOCUMENTATION_NODEJS_BACKEND.md` | All 70 Node endpoints |
| `07_KNOWN_ISSUES_REGISTER.md` | 15 verified findings, most severe first |
| `08_OPERATIONS_RUNBOOK.md` | Deploy, restart, recover, troubleshoot |
| `09_DEPENDENCY_MAP.md` | Including the confirmed live, multi-point dependency on workflow-blackhole |
| `10_REPOSITORY_INVENTORY.md` | Branches, commits, ecosystem repo list, maturity comparison |
| `11_CREDENTIALS_CONFIGURATION_REGISTER.md` | Where every credential lives (no values) |
| `12_REVIEW_PACKET.md` | Condensed sign-off summary, reconciled against the repo's existing SETU audit |
| `13_EVIDENCE_PACKET.md` | Every command run and its real output |
| `14_EXECUTIVE_ASSESSMENT.md` | Maturity, risk, recommended next steps |

## How this relates to the pre-existing docs in the repo root

This repository already contains substantial prior documentation — `HANDOVER.md`, `README.md`, `REVIEW_PACKET.md`, `CONVERGENCE_GAPS.md`, roughly a dozen `*_PROOF.md` files, and a dedicated, dated (2026-07-04) `SETU Ownership Transition__ Phase II (Post-Handover Audit)/` folder with its own gap register. This package builds on that work rather than duplicating or ignoring it — specific prior claims were re-verified against current code, with results (some confirmed fixed, one confirmed still open) documented in `07_KNOWN_ISSUES_REGISTER.md` and `12_REVIEW_PACKET.md`. Where this `handover/` package and the older docs disagree, treat this package as current.

## Read alongside

`workflow-blackhole/handover/` — the two repositories are more tightly coupled than the ecosystem map's summary suggests (three separate, verified integration points between this repo and Niyantran), so understanding both packages together gives a materially more complete picture than either alone.
