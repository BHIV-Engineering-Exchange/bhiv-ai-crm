# Known Issues Register — ai-crm (CRM + Logistics + SETU)

Every item below was independently confirmed by reading the actual source or running the actual code — nothing here is copied from the repo's extensive pre-existing documentation without re-verification. Where an item overlaps with the pre-existing `SETU Ownership Transition__ Phase II (Post-Handover Audit)/SETU_GAP_REGISTER.md` (dated 2026-07-04), that's noted explicitly, including where this handover found the prior finding to already be resolved. Ordered by severity, most severe first.

---

## 🔴 Critical

### 1. Python backend: hardcoded JWT fallback secret with no startup guard
**Where:** `backend/auth_system.py` — `SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ai-agent-logistics-secret-key-2025")`.
**Verified:** unlike `workflow-blackhole` (which hard-fails at boot if `JWT_SECRET` is unset), this backend has **no equivalent check**. If `JWT_SECRET_KEY` is ever unset in a real environment, the app starts normally and silently signs every token with the hardcoded fallback string. The `.env` reviewed here does set a value — but that value is literally `ai-crm-logistics-super-secret-jwt-key-2026-change-in-production`, a string that names itself as a placeholder never actually replaced.
**Recommendation:** add a startup check that refuses to boot without `JWT_SECRET_KEY` set (mirror `workflow-blackhole`'s pattern), remove the hardcoded fallback entirely, and rotate to a real generated secret before this is trusted with real user sessions.

### 2. 23 of the Python backend's endpoints (the Niyantran proxy layer) are configured to fail in any real deployment
**Where:** `backend/api_app.py`, the `=== INFIVERSE ENDPOINTS ===` section — 23 endpoints that proxy to `INFIVERSE_BASE_URL`.
**Verified:** the real `.env` sets `INFIVERSE_BASE_URL=http://localhost:5000` — a local-only address. The actual production Niyantran URL, confirmed elsewhere in this same ecosystem (`frontend/src/pages/Infiverse.jsx`), is `https://blackholeworkflow.onrender.com`. Unless this variable is overridden per-environment (not evidenced anywhere in this repo), every one of these 23 endpoints will attempt to reach `localhost:5000` on whatever machine the Python backend itself is running on — which won't have Niyantran on it — and fail.
**Recommendation:** set `INFIVERSE_BASE_URL` to the real production Niyantran URL in whatever environment configuration actually reaches production (this repo's `.env` is a local dev copy; confirm the production value directly with whoever deploys this backend).

### 3. Python backend has three deployment configurations that actively contradict each other
**Verified (full detail in `04_DEPLOYMENT_GUIDE.md` §4):**
- `Procfile` and `railway.json` both point at `python start_server.py` — **this file does not exist anywhere in the repository**, confirmed by a full repository search. This exact gap was already identified by the repo's own prior audit as `GAP-001` (2026-07-04) — independently re-confirmed here as still open.
- `Dockerfile.production`'s `docker-entrypoint.sh` requires `SECRET_KEY` and `DATABASE_URL` env vars or it exits(1) — the real `.env` has neither set correctly (`DATABASE_URL` is a leftover SQLite string, not the real Mongo connection; `SECRET_KEY` isn't set at all, only the differently-named `JWT_SECRET_KEY`).
- Only the plain `Dockerfile` (direct `uvicorn api_app:app` command) actually works as shipped.
**Recommendation:** pick one deployment path and make it correct; delete or fix the other two so they can't be trusted-then-fail during an actual incident or platform migration.

---

## 🟠 High

### 4. Both backends define incompatible schemas for the same shared MongoDB collections
**Verified, field-by-field, in `05_DATABASE_GUIDE.md` §1.** Python's `ProductModel`/`OrderModel` (Pydantic) and Node's `Product.js`/`Order.js` (Mongoose) use genuinely different field names and, for orders, a different data shape entirely (single-product vs. multi-product-via-`items`-array) — while both connect to the identical MongoDB Atlas database and, by naming convention, the identical collections.
**Recommendation:** this needs a deliberate architectural decision from the team — either designate one backend as the sole writer for these collections (with the other reading only, or not touching them at all), or formally separate the collections/database per backend. This is not something to silently leave as-is once known.

### 5. Both backends default to the same port (8000) — verified collision
**Verified:** `backend/.env`: `API_PORT=8000`. `backend-nodejs/.env`: `PORT=8000`. They cannot run simultaneously with default config.
**Recommendation:** document (or enforce) a standard port assignment for local development where both are expected to run together.

### 6. 2 of 4 Python pytest files fail to even collect
**Verified:** `python -m pytest tests/` errors with `ModuleNotFoundError: No module named 'chatbot_agent'` on `tests/test_agent.py` and `tests/test_integration.py`. No file named `chatbot_agent.py` exists anywhere in the repo (confirmed by search); a similarly-named `smart_chatbot.py` exists at the repo root and is almost certainly the intended target of an incomplete rename.
**Recommendation:** update the imports in both test files, or restore/rename the module they expect.

### 7. A pytest test hangs rather than failing
**Verified:** `tests/test_api.py::TestAPIEndpoints::test_get_returns_endpoint` (which calls `GET /get_returns`) does not complete within 60 seconds in this sandbox; the two tests before it in the same file pass normally. Consistent with this endpoint depending on live MongoDB connectivity this sandbox can't reach, but a test that hangs indefinitely instead of failing/timing out cleanly is itself worth fixing regardless of cause, since it can silently stall CI pipelines.
**Recommendation:** add an explicit timeout to this test, and confirm the endpoint itself fails fast (rather than hanging) when its database dependency is unreachable.

---

## 🟡 Medium

### 8. Misleading "Connected to MongoDB" log message in the Python backend
**Verified:** `database/mongodb_connection.py` prints `[OK] Connected to MongoDB (async): ...` immediately after constructing the Motor/PyMongo client object — before any real network operation is attempted. A direct test (constructing the client, then explicitly calling `admin.command('ping')`) showed the "connected" message printed instantly while the actual ping call hung/timed out. **Don't use this log line as evidence of real connectivity** — for yourself or when reading production logs.
**Recommendation:** move the log line to after a real `ping`/`server_info()` call succeeds, or clearly label it as "client initialized" rather than "connected."

### 9. Four Python API files exist but are not wired into the running app at all
**Verified:** `crm_api.py`, `courier_api.py`, `supplier_api.py`, `api_chatbot_endpoints.py` are not imported by `api_app.py` (confirmed by grep). Additionally, `main.py` and `final_api_backend.py` each define their **own separate `FastAPI()` instance** — alternate/earlier versions of this application that aren't the one actually deployed (`run_project.bat`, both Dockerfiles, and `railway.json` all point at `api_app:app`).
**Recommendation:** archive or delete these to avoid a future engineer mistaking one of them for the live app.

### 10. `docker-entrypoint.sh` checks for env var names the actual application doesn't use
**Verified:** the script validates `DATABASE_URL` and `SECRET_KEY`; the application code actually reads `MONGODB_URL` and `JWT_SECRET_KEY`. Related to item 3 above but worth calling out on its own — even if `DATABASE_URL`/`SECRET_KEY` were both set to satisfy the script, that wouldn't guarantee the *application* has what it needs, since it doesn't read those specific names for its real Mongo connection or JWT signing.
**Recommendation:** update the entrypoint script to check the variable names the application actually consumes.

### 11. Naming collision: two different files both named `test_agent.py`
**Verified:** a 328-line `test_agent.py` at the repo root and a 333-line `tests/test_agent.py` are confirmed different files (via `diff`), not duplicates or symlinks. Confusing for anyone searching by filename.

### 12. Pydantic MongoDB models cover fewer entities than the legacy SQLAlchemy schema
**Verified:** `database/models.py` (SQLAlchemy, legacy) defines 24 entity classes; `database/mongodb_models.py` (Pydantic, active) defines 18. Missing from the Mongo-era set: `DeliveryEvent`, `Alert`, `KPIMetric`, `NotificationLog`, `CommunicationLog`, `Note`. Not confirmed whether this is deliberate (features dropped) or an incomplete migration — worth a direct question to the team rather than an assumption either way.

### 13. `dashboard-frontend/` — a third, separate frontend application, deployment status unconfirmed
**Verified:** `backend/dashboard-frontend/` is a distinct React (MUI-based) app with its own `Dockerfile`/`nginx.conf`, separate from both the main `frontend/` and the Streamlit dashboards. Not deep-dived in this pass; confirm with the team whether it's actively deployed anywhere before assuming it's dead or assuming it's live.

---

## 🟢 Low / cosmetic

### 14. No dedicated health-check endpoint found in the Node backend
Unlike the Python backend's `GET /health`, no equivalent was found among the Node backend's 70 mounted endpoints. Worth adding if this service is ever placed behind a load balancer or orchestrator expecting one.

### 15. SETU prior audit (`SETU_GAP_REGISTER.md`, 2026-07-04) — status of spot-checked items
Of the 6 items marked "critical" in that pre-existing audit: **GAP-002** (routing adapter mis-initialization) and **GAP-004** (missing MongoDB drivers in `requirements.txt`) are **confirmed fixed** in the current code. **GAP-001** (missing `start_server.py`) is **confirmed still open** (= item 3 above). **GAP-003** and the remaining items were not independently re-verified line-by-line in this pass — recommend the team use that existing document as a checklist and re-run it against current code, since it's clearly still a useful, detailed source and roughly 1/3 of what was spot-checked here had already been fixed since it was written.

---

## Not a bug — worth knowing anyway

- **Both backends hash passwords correctly with bcrypt** — verified directly in `backend/auth_system.py` (`bcrypt.hashpw`/`bcrypt.checkpw`) and `backend-nodejs/src/models/User.js` (`bcrypt.genSalt`/`bcrypt.hash`/`bcrypt.compare`). Neither has the plaintext-password problem found in `workflow-blackhole`.
- **The two auth endpoint sets in the Python backend (`/auth/*` and `/api/auth/*`) are intentional, not a duplication bug** — the second set is explicitly built to match the shape a Niyantran/Infiverse-style consumer expects, and both ultimately call the same underlying `auth_system`.
- **Google Maps and Office 365 integrations degrade gracefully** when their API keys are absent — confirmed by reading the code, not just assumed from the "optional" framing in `.env.example`.
