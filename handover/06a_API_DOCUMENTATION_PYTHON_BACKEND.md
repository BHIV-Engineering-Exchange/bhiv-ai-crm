# API Documentation — `backend/` (Python/FastAPI)

**Base URL (dev):** `http://localhost:8000` (collides with the Node backend's default — see `04_DEPLOYMENT_GUIDE.md` §3) · **112 verified live endpoints**, extracted directly from source (script-generated, comment-aware — commented-out route definitions were excluded, not hand-typed).

## 1. Authentication

`Authorization: Bearer <jwt>` (`fastapi.security.HTTPBearer`), verified by `auth_system.py`'s `get_current_user`. Tokens are signed with `JWT_SECRET_KEY` — **verified: no startup guard exists for this variable**, unlike `workflow-blackhole`'s equivalent. If unset, the app silently falls back to a hardcoded string (`"ai-agent-logistics-secret-key-2025"`) rather than refusing to start. See `07_KNOWN_ISSUES_REGISTER.md`.

Two auth surfaces exist side by side — verified, not a bug, but worth knowing about:
- `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `/auth/users` — the general-purpose auth system.
- `POST /api/auth/login`, `/api/auth/register`, `GET /api/auth/me` — a second set, explicitly commented `# === INFIVERSE ENDPOINTS ===` in the source, built specifically to match the shape the Infiverse/Niyantran-style frontend expects. Both ultimately call the same underlying `auth_system` — this is intentional API-shape duplication for a specific consumer, not two competing auth systems.

## 2. The Niyantran proxy layer — 23 of the 86 `api_app.py` endpoints, and a real configuration gap

A meaningful fraction of this backend's endpoint surface isn't CRM/logistics logic at all — it's a reverse proxy to workflow-blackhole (Niyantran). Endpoints under the `=== INFIVERSE ENDPOINTS ===` section (e.g. `GET/POST /api/tasks`, `/api/monitoring/{path}`, `/api/attendance/{path}`, and more) forward the incoming request to `INFIVERSE_BASE_URL` + the equivalent path.

**Verified configuration gap:** `INFIVERSE_BASE_URL` is set in the real `.env` to `http://localhost:5000` — a **local-only address**. Elsewhere in this same ecosystem (the frontend's `Infiverse.jsx`), the real production Niyantran URL is `https://blackholeworkflow.onrender.com`. Unless `INFIVERSE_BASE_URL` is overridden to the real production URL wherever this backend is actually deployed, **all 23 of these proxy endpoints will fail** in production (attempting to reach `localhost:5000` on the API server itself, which won't have Niyantran running on it). This is a real, verified, high-impact configuration gap — see `07_KNOWN_ISSUES_REGISTER.md`.

## 3. A fully-documented example: `GET /health`

Returns `200` with a simple status payload — this is the endpoint both `Dockerfile`s' `HEALTHCHECK` and `railway.json` poll. No auth required (verified — not behind `Depends(get_current_user)`).

## 4. A fully-documented example: SETU's core routing endpoint

### `POST /setu/route` (protected)

Backed by `setu/sovereign_routing_adapter.py`'s `SovereignRoutingAdapter` (confirmed correctly initialized — no-argument constructor call, matching the fix for the prior audit's `GAP-002`). This is SETU's entry point for routing a request through the TANTRA execution flow described in `ECOSYSTEM_REPOSITORY_MAP.md`. For the exact request/response schema, read `setu/sovereign_routing_adapter.py` directly — this handover doesn't fabricate a field-by-field contract for an endpoint whose exact payload shape wasn't independently re-derived in this pass, in line with the "verified before writing" standard applied throughout this package.

## 5. Common failure-scenario conventions (verified pattern)

| Status | Meaning |
|---|---|
| `400` | Validation error (e.g. `/api/auth/register` on bad input) |
| `401` | Missing/invalid JWT, or (specifically for `/api/auth/login`) any login failure — caught broadly and reported as `401 Invalid credentials` regardless of the underlying cause |
| `403` | Authenticated but insufficient role (`Depends(require_role(...))` / `require_permission(...)`) |
| `500` | Unhandled server error — FastAPI's default handler, real error detail may leak into the response depending on debug settings; confirm production debug mode is off |

## 6. Dependencies per endpoint group

| If this is unavailable | These endpoints degrade or fail |
|---|---|
| MongoDB Atlas | Nearly everything — confirmed by the database layer being the primary data source for both CRM and logistics data |
| Niyantran (`INFIVERSE_BASE_URL`) | All 23 `/api/*` Infiverse-proxy endpoints — and, per the verified config gap above, this may already be broken in any real deployment |
| Google Maps API | Location/visit-tracking features in `integrations/google_maps_integration.py` — degrades gracefully (logged warning, not a crash) if the key is absent, confirmed by reading the code |
| Office 365 API | `integrations/office365_integration.py`-backed features |
| LLM provider | `integrations/llm_query_system.py`-backed AI/LLM query endpoints |

## 7. Full verified endpoint reference (112 endpoints)

Grouped by source file, generated directly from the mounted routes (script-extracted, comment-aware).

<details><summary><b>api_app.py (main)</b> — 86 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/` |
| GET | `/health` |
| POST | `/auth/login` |
| POST | `/auth/refresh` |
| POST | `/auth/logout` |
| POST | `/auth/register` |
| GET | `/auth/me` |
| GET | `/auth/users` |
| GET | `/orders` |
| GET | `/orders/{order_id}` |
| GET | `/returns` |
| GET | `/restock-requests` |
| GET | `/inventory` |
| GET | `/inventory/low-stock` |
| GET | `/agent/status` |
| POST | `/agent/run` |
| GET | `/reviews/pending` |
| GET | `/logs` |
| GET | `/analytics/performance` |
| GET | `/get_orders` |
| GET | `/get_returns` |
| GET | `/procurement/purchase-orders` |
| GET | `/procurement/suppliers` |
| POST | `/procurement/suppliers` |
| PUT | `/procurement/suppliers/{supplier_id}` |
| POST | `/procurement/run` |
| GET | `/delivery/shipments` |
| GET | `/delivery/track/{tracking_number}` |
| GET | `/delivery/order/{order_id}` |
| GET | `/delivery/couriers` |
| POST | `/delivery/run` |
| GET | `/dashboard/kpis` |
| GET | `/dashboard/alerts` |
| POST | `/dashboard/notifications/run` |
| GET | `/dashboard/charts` |
| GET | `/api/employee/{employee_id}/metrics` |
| POST | `/api/employee/{employee_id}/review-request` |
| GET | `/api/employee/{employee_id}/attendance` |
| PUT | `/api/employee/{employee_id}/privacy` |
| POST | `/api/attendance/checkin` |
| POST | `/api/attendance/checkout` |
| GET | `/api/attendance/{employee_id}` |
| GET | `/dashboard/activity` |
| POST | `/accounts` |
| GET | `/accounts` |
| GET | `/accounts/{account_id}` |
| PUT | `/accounts/{account_id}` |
| POST | `/contacts` |
| GET | `/contacts` |
| GET | `/contacts/{contact_id}` |
| POST | `/leads` |
| GET | `/leads` |
| GET | `/leads/{lead_id}` |
| POST | `/leads/{lead_id}/convert` |
| POST | `/opportunities` |
| GET | `/opportunities` |
| GET | `/opportunities/{opportunity_id}` |
| PUT | `/opportunities/{opportunity_id}/stage` |
| POST | `/activities` |
| GET | `/activities` |
| PUT | `/activities/{activity_id}/complete` |
| POST | `/tasks` |
| GET | `/tasks` |
| GET | `/account/view/{account_id}` |
| GET | `/lead/pipeline` |
| GET | `/opportunity/status` |
| POST | `/llm_query` |
| POST | `/integrations/office365/email` |
| POST | `/integrations/google-maps/visit` |
| POST | `/integrations/bos/order` |
| GET | `/dashboard/crm` |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| POST | `/api/tasks` |
| GET | `/products` |
| GET | `/products/{product_id}` |
| POST | `/products` |
| PUT | `/products/{product_id}` |
| DELETE | `/products/{product_id}` |
| GET | `/products/categories` |
| GET | `/products/stats` |
| POST | `/products/{product_id}/images/primary` |
| POST | `/products/{product_id}/images/gallery` |
| GET | `/products/{product_id}/images` |
| DELETE | `/products/{product_id}/images/{image_type}` |

</details>

<details><summary><b>setu/routes.py</b> — 20 endpoints</summary>

| Method | Path |
|---|---|
| POST | `/setu/route` |
| GET | `/setu/lineage/{trace_id}` |
| GET | `/setu/telemetry/{trace_id}` |
| POST | `/setu/signals/ingest` |
| GET | `/setu/signals/{trace_id}` |
| POST | `/setu/niyantran/task-state` |
| POST | `/setu/niyantran/submission-state` |
| POST | `/setu/niyantran/execution-status` |
| GET | `/setu/niyantran/timeline/{trace_id}` |
| POST | `/setu/contract/validate` |
| GET | `/setu/bucket/verify/{execution_id}/{trace_id}` |
| GET | `/setu/bucket/lineage/{trace_id}` |
| POST | `/setu/test/failures` |
| GET | `/setu/failures/{trace_id}` |
| GET | `/setu/ui/candidate/{trace_id}` |
| GET | `/setu/ui/tasks/{trace_id}` |
| GET | `/setu/ui/signals/{trace_id}` |
| GET | `/setu/ui/severity/{trace_id}` |
| GET | `/setu/ui/timeline/{trace_id}` |
| GET | `/setu/ui/dashboard/{trace_id}` |

</details>

<details><summary><b>customer_portal_api.py</b> — 6 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/customer/products` |
| POST | `/customer/orders` |
| GET | `/customer/orders` |
| GET | `/customer/orders/{order_id}` |
| GET | `/admin/procurement/requests` |
| PUT | `/admin/procurement/{procurement_id}/approve` |

</details>
