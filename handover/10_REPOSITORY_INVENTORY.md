# Repository Inventory — ai-crm (CRM + Logistics + SETU)

## 1. This repository

| Field | Value | Source |
|---|---|---|
| Remote | `https://github.com/blackholeinfiverse51/ai-crm.git` | `git remote -v` |
| Production branch | `main` | `git branch -a` |
| Active feature branch | `feature/partner-setu-dispatch` — same branch name as the one active in `workflow-blackhole`, suggesting coordinated cross-repo feature work | `git branch -a` |
| Total commits on `main` | 33 | `git rev-list --count main` |
| Most recent commit | 2026-07-17, "setu e2e test" | `git log` |
| CI/CD | None found in this repository | direct file check — contrast with `workflow-blackhole`'s `.github/workflows/cicd.yml` |
| Notable historical commit | "Niyantran, Ai-crm, Artha, Sampada live signal integrate, change env of frontend-backend + delete nested ai-crm" — confirms a previously-nested duplicate `ai-crm` folder existed and was removed, and confirms this integration work was done across multiple ecosystem repos in one coordinated push | `git log` |

**Uncommitted state note:** same caveat as `workflow-blackhole` — this package was built from a zipped snapshot, not a live `git clone`; any apparent uncommitted changes in the working copy used for this review are very likely line-ending normalization artifacts, not real pending work, but should be confirmed against the team's actual working copy.

## 2. Full ecosystem repository list (per `ECOSYSTEM_REPOSITORY_MAP.md`)

Same table as documented in `workflow-blackhole/handover/10_REPOSITORY_INVENTORY.md` — reproduced here for completeness since each handover folder is meant to be readable independently:

| Repository / folder | System | Reviewed in this handover? |
|---|---|---|
| `INFIVERSE-HR-PLATFORM` | Sampada | No — not provided |
| `workflow-blackhole` | Niyantran / Workflow Executor | **Yes — separate package in `workflow-blackhole/handover/`** |
| `ai-crm` (this repo) | CRM + Logistics + SETU | **Yes — this package** |
| `Artha` / `AI-Artha` | Artha | No — not provided |
| `bucket` | Bucket | No — not provided as a standalone repo; SETU here integrates with it via `setu/bucket_lineage_adapter.py` |
| `Prana` | PRANA | No — not provided, no reference found in this codebase |
| `bhiv-registry` | InsightFlow | No — not provided, no reference found |
| `Karma-Tracker` | Karma | No — not provided, no reference found |

## 3. Comparison with `workflow-blackhole`'s repository maturity

| | `workflow-blackhole` | `ai-crm` |
|---|---|---|
| Commits on `main` | 196 | 33 |
| CI/CD pipeline | Full, automated, with rollback | None found |
| Automated tests | 98/98 passing (Node backend) | Python: partial (2/4 files collect); Node: none exist |
| Deployment config consistency | One clear path (Docker + CI/CD) | Three conflicting paths for the Python backend alone |

This isn't a criticism in isolation — `ai-crm` is doing genuinely more architecturally (two backends, three UI surfaces, a dedicated SETU module) — but it does mean this repository needs more operational hardening before it matches `workflow-blackhole`'s deployment maturity, and that gap is exactly what `07_KNOWN_ISSUES_REGISTER.md` and `14_EXECUTIVE_ASSESSMENT.md` focus on.
