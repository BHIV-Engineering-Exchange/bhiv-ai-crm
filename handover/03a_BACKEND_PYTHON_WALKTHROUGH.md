# Source Code Walkthrough — `backend/` (Python/FastAPI)

135 Python files, all individually syntax-checked (`py_compile`) with zero errors. This document maps the real structure — including which of the many top-level scripts are actually part of the running application vs. standalone tools.

## 1. Runtime lifecycle

1. `uvicorn api_app:app` starts (confirmed as the real entrypoint via `run_project.bat`, `Dockerfile`, and the `HEALTHCHECK`/`EXPOSE 8000` directives — **not** `main.py`, `final_api_backend.py`, `Procfile`'s `start_server.py`, or `railway.json`'s same reference, none of which are the live path — see `07_KNOWN_ISSUES_REGISTER.md`).
2. `database/mongodb_connection.py` constructs a Motor/PyMongo client — **verified: this does not confirm real connectivity**, it just prints an optimistic "Connected" message on client construction (see Known Issues).
3. `setu_router` is included (`app.include_router(setu_router)`), mounting all 19 `/setu/*` endpoints.
4. `customer_router` is included, mounting the 6 customer-portal endpoints.
5. The remaining 86 endpoints defined directly with `@app.get/post/...` in `api_app.py` become active.
6. `product_image_api.py`'s functions are imported individually and wired as handlers for 4 specific image-upload endpoints — the only other top-level script that's actually reached at runtime.

## 2. Directory structure

```
backend/
├── api_app.py            2,298 lines — the real application; 86 direct endpoints
├── auth_system.py         JWT auth (HTTPBearer) — used by api_app.py AND setu/routes.py
├── customer_portal_api.py  6 endpoints, included via include_router
├── product_image_api.py    4 functions imported individually into api_app.py
├── setu/                   20 endpoints, prefix /setu — see §3
├── database/                Mongo connection layer (+ a legacy SQLite path, see below)
├── integrations/             Google Maps, Office 365, LLM query system (4 files)
├── BHIV_Integrator_Core/       27 files — ecosystem integration core (see §4)
├── tests/                     4 pytest files — 2 fail to collect, see §5
├── dashboard-frontend/          A SEPARATE React (MUI) app — its own Dockerfile/nginx, distinct
│                                  from the main frontend/ at the repo root
├── static/, data/, docs/         Assets, data files, and pre-generated API docs/Postman collection
└── ~65 other top-level .py files  One-off scripts, migrations, alternate dashboards, and
                                     several NOT wired into api_app.py at all (see §6)
```

## 3. SETU module (`setu/`, 16 files, 20 endpoints, all behind `Depends(get_current_user)`)

| File | Role |
|---|---|
| `routes.py` | All 19 `/setu/*` endpoint definitions |
| `sovereign_routing_adapter.py` | Backs `POST /setu/route` |
| `trace_continuity.py` + `trace_continuity_middleware.py` | Lineage/trace-ID propagation, applied as app-level middleware |
| `signal_ingestion.py` | Backs `POST /setu/signals/ingest`, `GET /setu/signals/{trace_id}` |
| `niyantran_integration_adapter.py` | Backs the 4 `/setu/niyantran/*` endpoints — the code-level link to workflow-blackhole |
| `contract_validation.py` | Backs `POST /setu/contract/validate` |
| `bucket_lineage_adapter.py` | Backs the 2 `/setu/bucket/*` endpoints |
| `failure_handler.py` | Backs `/setu/test/failures`, `/setu/failures/{trace_id}` |
| `ui_visibility_service.py` | Backs the 5 `/setu/ui/*` endpoints |
| `mongo_store.py` | SETU's own Mongo persistence layer |
| `sampada_dispatcher.py`, `telemetry_layer.py` | Sampada-compatible dispatch and telemetry — recently touched (2026-07-03) |
| `dependency_graph_engine.py`, `utils.py` | Support code |

This repo already contains a very thorough, dated (2026-07-04) audit of this exact module at `SETU Ownership Transition__ Phase II (Post-Handover Audit)/`. Independent re-verification of 4 of its 6 "critical blocker" findings during this handover: **GAP-002** (routing adapter mis-initialized) and **GAP-004** (missing MongoDB drivers in `requirements.txt`) are **now fixed** — confirmed by reading the current code. **GAP-001** (missing `start_server.py`) is **still open** — independently re-confirmed. **GAP-003** (middleware scope) and the remaining items were not independently re-verified line-by-line in this pass; treat the original gap register as a checklist still worth working through, not as fully current.

## 4. `BHIV_Integrator_Core/` (27 files)

A self-contained ecosystem-integration core, syntax-clean, separate from `setu/`. Given the name overlap with the wider BHIV ecosystem, treat this as this repo's own integration engine (distinct from, and likely complementary to, the SETU module) — worth a dedicated deep-dive by the team if BHIV_Integrator_Core is actively used in production, since this handover's time budget went toward the primary API surface and SETU specifically.

## 5. Tests (`tests/`, 4 files)

| File | Result |
|---|---|
| `test_api.py` | Collects and partially runs — first 2 tests pass; a 3rd (`test_get_returns_endpoint`, hitting `GET /get_returns`) **hangs** rather than failing, consistent with it depending on live MongoDB connectivity this sandbox can't reach |
| `test_setu_e2e.py` | Collects successfully (part of the same 16-item run as `test_api.py`) |
| `test_agent.py` | **Fails to collect** — `ModuleNotFoundError: No module named 'chatbot_agent'` |
| `test_integration.py` | **Fails to collect** — same missing-module error |

**Verified root cause:** no file named `chatbot_agent.py` exists anywhere in the repo. A similarly-named `smart_chatbot.py` does exist at the repo root — almost certainly the intended target of a rename that wasn't propagated to the test imports. See `07_KNOWN_ISSUES_REGISTER.md`.

Also worth knowing: a **different, similarly-named** `test_agent.py` exists at the repo root (328 lines) alongside `tests/test_agent.py` (333 lines) — confirmed different files via `diff`, not duplicates. Don't assume they're interchangeable.

## 6. Top-level scripts — what's live vs. standalone

**Confirmed wired into the running app:** `api_app.py`, `auth_system.py`, `customer_portal_api.py`, `product_image_api.py`.

**Confirmed NOT imported by `api_app.py`** (verified by grep — these are standalone scripts, run manually or not at all): `crm_api.py`, `courier_api.py`, `supplier_api.py`, `api_chatbot_endpoints.py`, `main.py`, `final_api_backend.py`. Several of these look like earlier, alternate, or in-progress FastAPI apps of their own (`main.py` and `final_api_backend.py` both define their own `FastAPI()` instances) — don't assume any of them are reachable in production just because they exist.

**Streamlit dashboards** (separate processes, separate ports, not REST APIs): `crm_dashboard.py` (8502), `dashboard_app.py` (8503), and a product-catalog dashboard (8505 per `run_project.bat`) — likely `product_catalog_dashboard.py` at the repo root, though the exact filename wasn't cross-referenced against the batch script's port assignment in this pass.

**Everything else** (migrations, one-off test/demo scripts, `deploy.py`, `generate_docs.py`, notification/supplier utilities, etc.) — read the specific file directly if you need it; there's no single organizing pattern across these beyond "useful script written at some point," and treating any of them as part of the live request path without checking would be a mistake.

## 7. A legacy path worth knowing about: SQLite

`database/models.py` and `DATABASE_URL` (set in `.env` to `sqlite:///logistics_agent.db`) point at what looks like an earlier, pre-MongoDB-migration data layer. `MONGODB_MIGRATION_COMPLETE.md` in the repo root documents that this migration already happened. Treat `DATABASE_URL`/SQLite as legacy/vestigial unless you find a specific still-active code path that reads from it — the main application (`api_app.py`) reads from MongoDB via `MONGODB_URL`, confirmed directly.
