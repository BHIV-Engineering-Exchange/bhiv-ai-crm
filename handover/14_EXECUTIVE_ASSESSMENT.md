# Executive Assessment — ai-crm (CRM + Logistics + SETU)

## Current maturity

**Functionally rich, operationally less mature than `workflow-blackhole`.** This repository does more architecturally — two independent backends, a dedicated SETU module, a customer portal, procurement workflows, three Streamlit dashboards, and a third standalone dashboard frontend — but that breadth has come with real deployment and consistency debt: three contradictory deployment configs for the Python backend, no CI/CD pipeline, no test suite at all for the Node backend, and a shared database whose two writers don't agree on schema. This reads as a system that grew quickly through real feature delivery (33 commits building substantial functionality) without a corresponding investment in deployment hygiene — which is a completely normal trajectory, but one that needs deliberate catch-up now, especially given a handover is happening.

## Remaining work

In priority order:

1. **Fix `INFIVERSE_BASE_URL`** for the real production environment (`07_KNOWN_ISSUES_REGISTER.md` #2) — quick fix, currently breaks 23 endpoints.
2. **Resolve the Python backend's three-conflicting-deploy-configs situation** (#3) — pick one, make it correct, remove or fix the other two.
3. **Add a JWT startup guard to the Python backend** and rotate away from the placeholder secret (#1).
4. **Resolve the shared-database schema divergence** (#4, Database Guide §1) — this needs a real design decision from the team (single-writer boundary, or split the collections), not just a code patch. Flag this to whoever owns data architecture (MDU, per the ecosystem map's routing table) as early as possible given it's the most structurally significant open item in this whole handover.
5. **Fix the two collectible-but-broken pytest files** (#6) — small effort (fix an import), meaningfully improves the Python backend's test coverage story.
6. **Build a minimal test suite for the Node backend** — currently zero automated coverage; even a handful of smoke tests on the 70 endpoints would be a large relative improvement.
7. **Build a CI/CD pipeline** for at least the Node backend (the cleaner, more consistent of the two) — `workflow-blackhole`'s pipeline is a solid template to adapt.

## Production readiness

**Conditionally production-ready, closer to "needs deployment cleanup before it can be trusted" than `workflow-blackhole`'s "needs one security fix."** The Node backend specifically is in good shape (clean, all endpoints verified, correct password hashing) and could reasonably be called production-ready on its own. The Python backend has three separate, verified reasons a naive redeploy or platform migration could fail outright, plus a live (not hypothetical) configuration gap already breaking a meaningful chunk of its endpoint surface.

## Risks

| Risk | Severity | Mitigated by |
|---|---|---|
| Python backend fails to deploy on a new platform (Heroku/Railway) due to missing `start_server.py` | High | Nothing currently — needs the fix in item 3 above; the working `Dockerfile` path is the safe fallback until then |
| 23 Niyantran-proxy endpoints silently failing in production | High | Nothing currently — this may already be actively happening; needs immediate confirmation and fix |
| Data corruption/inconsistency between the two backends' incompatible schemas for shared collections | Medium-High, and hard to detect from outside | Nothing currently — needs a team decision, not just monitoring |
| Silent JWT fallback if `JWT_SECRET_KEY` is ever unset | Medium | Nothing currently — needs the startup guard in item 3 |
| No automated tests for the Node backend | Medium (regression risk, not an active bug) | Nothing currently |
| No CI/CD, so deploys are manual and undocumented per-backend | Medium (process risk) | This handover package itself, until real automation exists |

## Recommended next steps

1. Treat `07_KNOWN_ISSUES_REGISTER.md` items 1–4 as a pre-handover-completion punch list, not backlog items — they're all concrete, verified, and fast to fix relative to their impact.
2. Escalate the shared-database schema question specifically — it's the one item here that isn't a simple code fix and needs a decision-maker, not just an engineer.
3. Use this package's `03a`/`03b` split as the basis for assigning ownership going forward — whoever inherits this system should know from day one that these are two backends with different jobs, not a single system with two implementations of the same thing.
4. Once items 1–4 are resolved, revisit whether the existing `SETU_GAP_REGISTER.md`'s remaining un-re-verified items are still open — that document is a strong asset that just needs a fresh pass now that some of its findings are already stale.
5. Consider whether `dashboard-frontend/` and the three Streamlit dashboards are all still needed — four separate UI surfaces (main frontend, dashboard-frontend, 3 Streamlit apps) for one system is a lot of surface area to maintain, and consolidating or retiring unused ones would reduce the handover burden for whoever inherits this next.
