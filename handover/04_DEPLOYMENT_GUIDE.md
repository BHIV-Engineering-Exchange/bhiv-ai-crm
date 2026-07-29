# Deployment Guide — ai-crm (CRM + Logistics + SETU)

Covers both backends and the frontend. Where a deployment path was found broken by direct testing/inspection rather than assumed, that's called out explicitly — this repo has more deployment-config inconsistency than `workflow-blackhole`, so treat every path below on its own merits rather than assuming they all work equally.

## 1. Local development — Python backend

```bash
cd backend
python -m venv venv && source venv/bin/activate    # or venv\Scripts\activate on Windows
pip install -r requirements.txt                     # verified: clean install, ~83 packages
cp .env.example .env                                 # then fill in real values
uvicorn api_app:app --host 0.0.0.0 --port 8000 --reload
```
Verified: imports cleanly, prints `[OK] Connected to MongoDB (async): ai_crm_logistics` — **note this message is printed as soon as the client object is constructed, not after a real ping**, so don't treat it as proof of live connectivity (see `13_EVIDENCE_PACKET.md`).

## 2. Local development — Node backend

```bash
cd backend-nodejs
npm install                # verified: clean install
cp .env.example .env       # then fill in real values — note PORT=8000 collides with the Python backend, see below
npm run seed                # optional: populate initial data
npm start                   # or: npm run dev (nodemon)
```
Verified: boots, opens port 8000, connects to Mongo, and — if Mongo is unreachable — exits the whole process (not just failing individual requests). Confirmed by live testing.

## 3. ⚠ Running both backends together — port collision, verified

**Both backends default to port 8000.** `backend/.env` sets `API_PORT=8000`; `backend-nodejs/.env` sets `PORT=8000`. Confirmed directly in both files — this isn't a guess. To run both simultaneously for local development, one of them **must** be reconfigured (e.g. run the Node backend on 8000 as the frontend expects by default, and move the Python backend to a different port, updating whatever calls it accordingly — the SETU/customer-portal/dashboard consumers, not the main frontend). Neither `.env` currently does this — it's left to whoever runs both locally to notice.

## 4. Python backend — three deployment paths, verified inconsistent

This backend has **three different deployment configurations that disagree with each other.** Test each on its own merits:

| Path | Command | Status (verified) |
|---|---|---|
| Plain `Dockerfile` | `CMD ["uvicorn", "api_app:app", "--host", "0.0.0.0", "--port", "8000"]` | **Works** — correct, minimal, matches the real entrypoint |
| `Dockerfile.production` + `docker-entrypoint.sh` | Entrypoint script requires `DATABASE_URL` and `SECRET_KEY` env vars or exits(1) | **Broken as currently configured** — the real `.env` sets `DATABASE_URL` to a leftover SQLite string (not the Mongo connection actually used) and does not set `SECRET_KEY` at all (only `JWT_SECRET_KEY`, a different name). This container will refuse to start. |
| `Procfile` (Heroku-style) / `railway.json` (Railway) | Both: `python start_server.py` | **Broken** — `start_server.py` does not exist anywhere in this repository, confirmed by a full repository search. Any deploy through either of these platforms using these configs fails immediately. |

**Recommendation:** standardize on the plain `Dockerfile` path (or fix the other two to match it) before relying on any platform-specific deploy for this backend.

## 5. Node backend deployment

No Dockerfile, Procfile, or platform config (`render.yaml`, `railway.json`, etc.) exists for `backend-nodejs/` in this repository. Its actual hosting mechanism is not defined in the codebase — confirm directly with whoever manages hosting. Given `frontend/`'s default `VITE_API_URL` is `http://localhost:8000` and there's no override file committed, also confirm what the real production `VITE_API_URL` is pointed at, since — same as `workflow-blackhole` — this is a Vite build-time value baked into the static bundle, not a runtime-configurable one.

## 6. Frontend

```bash
cd frontend
npm install
npm run build        # verified: succeeds, produces dist/
```
No deployment config file (Vercel/Netlify/Dockerfile) was found for this package either. `VITE_API_URL` must be set correctly before this build step if the production API isn't at the default `localhost:8000`.

## 7. Other UI surfaces to know about (not part of the main deploy story, but real)

- **`backend/dashboard-frontend/`** — a separate React (MUI) app with its own `Dockerfile` and `nginx.conf`. Not reviewed in depth in this pass; confirm with the team whether it's currently deployed anywhere.
- **3 Streamlit dashboards** (`crm_dashboard.py` port 8502, `dashboard_app.py` port 8503, a product-catalog dashboard around 8505 per `run_project.bat`) — these are separate long-running processes, not part of the FastAPI app, and have no containerization found in this repo.

## 8. Environment variables

Both backends' `.env.example` files exist; cross-reference against `11_CREDENTIALS_CONFIGURATION_REGISTER.md` for the full picture, including the naming mismatches called out above (`DATABASE_URL` vs `MONGODB_URL`, `SECRET_KEY` vs `JWT_SECRET_KEY`).

## 9. Health checks

- Python backend: `GET /health` — confirmed present in `api_app.py`, referenced by both Dockerfiles' `HEALTHCHECK` directive and by `railway.json`.
- Node backend: no dedicated health-check endpoint was found among the 70 mounted endpoints during the route audit — confirm with the team whether one should be added, especially if this backend is ever put behind a load balancer or orchestrator that expects one.

## 10. Third-party services

MongoDB Atlas (shared by both backends — see `05_DATABASE_GUIDE.md`), Google Maps API, Office 365 API, an LLM provider (both backends have their own LLM-query integration), and — for the frontend's `Infiverse.jsx` view specifically — the live `workflow-blackhole` production API.
