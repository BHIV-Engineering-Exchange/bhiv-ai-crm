# Review Packet — ai-crm (CRM + Logistics + SETU)

**Purpose:** the condensed version of this handover — everything a reviewer (Vijay Dhawan, Isha Singh, Soham Kotkar) needs to sign off on, without reading all 17 documents.

## Relationship to this repo's extensive pre-existing documentation

This repository already contains an unusually large amount of prior status/proof documentation: a root-level `HANDOVER.md`, `README.md`, `REVIEW_PACKET.md`, `CONVERGENCE_GAPS.md`, and roughly a dozen `*_PROOF.md` files, plus a dedicated, dated (2026-07-04) `SETU Ownership Transition__ Phase II (Post-Handover Audit)/` folder with its own detailed gap register. This handover package did not start from zero — it used that existing work as a starting hypothesis and **independently re-verified specific claims against current code**, rather than either ignoring it or accepting it uncritically. Concretely: of the 6 items marked "critical" in `SETU_GAP_REGISTER.md`, 4 were spot-checked here — 2 (`GAP-002`, `GAP-004`) are now confirmed fixed, 1 (`GAP-001`) is confirmed still open, and the rest are flagged as needing the same treatment rather than assumed either way. Read the existing SETU audit trail for the deep historical narrative; read this package for the current, independently-verified state across the whole repository (both backends, not just SETU).

## Test results (re-run, not assumed)

- **Python backend:** `pytest tests/` — 2 of 4 files fail to collect (`ModuleNotFoundError: chatbot_agent`); of the 2 that collect, tests pass until a hang was hit on `test_get_returns_endpoint`.
- **Node backend:** no test suite exists (confirmed — `package.json` has no `test` script).

## Build results (re-run, not assumed)

- Python backend: clean `pip install`, imports cleanly, boots.
- Node backend: clean `npm install`, boots, correctly exits on DB failure.
- Frontend: clean `npm install`, `npm run build` succeeds.

## Sign-off checklist

| Item | Status | Detail |
|---|---|---|
| Both backends build/boot | ✅ Pass | |
| Node backend endpoints all verified real | ✅ Pass | 70, script-extracted |
| Python backend endpoints all verified real | ✅ Pass | 112, script-extracted |
| Both backends hash passwords correctly | ✅ Pass | Verified — no plaintext-password issue here (contrast with `workflow-blackhole`) |
| Python backend has a production-breaking deploy config issue | 🔴 Yes | 3 conflicting deploy paths, only 1 works — item 3 |
| Python backend has a hardcoded JWT fallback with no guard | 🔴 Yes | Item 1 |
| 23 endpoints configured to fail in production | 🔴 Yes | `INFIVERSE_BASE_URL` gap — item 2 |
| Shared database, incompatible schemas | 🟠 Yes | Field-level confirmed — item 4 |
| Automated test coverage | 🟡 Partial/weak | Python: partial; Node: none |
| CI/CD pipeline exists | ❌ No | Unlike `workflow-blackhole` |
| SETU module implemented and partially re-audited | ✅ Pass, with open items | See above |

## What reviewers should specifically look at first

1. **`07_KNOWN_ISSUES_REGISTER.md` items 1–3** — all three are genuine production-deployment blockers or silent-failure risks for the Python backend specifically, and none of them require guesswork to fix (all three have a clear, verified root cause).
2. **`05_DATABASE_GUIDE.md` §1** — the shared-database schema divergence. This is the one finding in this package that needs an actual team decision, not just a code fix.
3. **`01_EXECUTIVE_OVERVIEW.md`**'s two-backend explanation — make sure whoever picks this up understands which backend serves the main frontend before doing anything else, since it's not obvious from the ecosystem map alone.

## Acceptance

Per `ECOSYSTEM_REPOSITORY_MAP.md`, ecosystem-level acceptance authority sits with **Rishabh Yadav**; this specific handover's owner is **Shashank Mishra**.
