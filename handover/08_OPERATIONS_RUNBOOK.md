# Operations Runbook — ai-crm (CRM + Logistics + SETU)

## 1. How to deploy

No CI/CD pipeline (GitHub Actions or otherwise) was found in this repository — unlike `workflow-blackhole`, deployment here is not automated within the repo. `04_DEPLOYMENT_GUIDE.md` covers the manual paths for each component; in short:
- **Python backend:** use the plain `Dockerfile` path (confirmed working) — avoid `Procfile`/`railway.json` until the missing `start_server.py` is resolved, and avoid `Dockerfile.production` until its required env vars are actually set correctly.
- **Node backend:** no deployment config exists in this repo at all — confirm the real hosting mechanism directly with the team.
- **Frontend:** standard `npm run build`, deploy the `dist/` output wherever it's actually hosted (not defined in this repo).

## 2. How to restart

```bash
# Python backend
cd backend && uvicorn api_app:app --host 0.0.0.0 --port 8000
# or, if containerized:
docker restart <container-name>

# Node backend
cd backend-nodejs && npm start
# or:
docker restart <container-name>
```
No process manager configuration (pm2, systemd) was found for either backend in this repo.

## 3. How to recover from common failures

| Symptom | Likely cause | What to check |
|---|---|---|
| Python backend boots but every `/api/*` Infiverse-proxy call fails | `INFIVERSE_BASE_URL` still set to `localhost:5000` in the deployed environment | Confirmed real gap — see `07_KNOWN_ISSUES_REGISTER.md` item 2. Set it to the real Niyantran production URL. |
| Node backend exits immediately after appearing to start | MongoDB connection failed | `src/config/database.js` calls `process.exit(1)` on failure — verified behavior, check Mongo Atlas connectivity/credentials |
| Python backend logs "Connected to MongoDB" but queries still fail/hang | The log line doesn't mean what it appears to mean — see item 8 in Known Issues | Test actual connectivity directly (e.g. a real `ping` command), don't trust the log line alone |
| Both backends won't start together locally | Port collision (both default 8000) | Reconfigure one via `PORT`/`API_PORT` |
| `Procfile`/`railway.json`-based deploy fails immediately | `start_server.py` doesn't exist | Use the plain `Dockerfile`'s `uvicorn api_app:app` command instead, or create the missing file |
| Products/orders data looks inconsistent between the two backends | Shared-database schema divergence (Known Issues item 4) | Confirm with the team which backend is the intended writer for these collections |

## 4. Log locations

No centralized log shipping found for either backend — both rely on stdout/stderr (`console.log`/`print`, standard framework logging). Whatever supervises the process (Docker, systemd, a hosting platform's own log viewer) is the practical place to look; nothing in this repo configures file-based or remote logging.

## 5. Monitoring process

No monitoring stack (Prometheus/Grafana or equivalent) was found configured for this repository, unlike `workflow-blackhole`'s production setup. The Python backend's `GET /health` and the general responsiveness of both backends' endpoints are the only built-in signals available. Confirm with the team whether an external monitoring/uptime service watches these in production.

## 6. Troubleshooting guide (step-by-step)

1. **Identify which backend the failing request actually hit.** Given the port collision and the fact that the frontend's default points at 8000 (ambiguous between the two), confirm which service is actually listening on the port in question before debugging further.
2. **Check the process's own stdout/stderr** for the real error — both backends' route handlers generally return generic error messages to the client while logging the real cause server-side.
3. **If it's a Niyantran-proxy failure specifically** (`/api/tasks`, `/api/monitoring/*`, `/api/attendance/*` on the Python backend), check `INFIVERSE_BASE_URL` first — this is a known, verified gap, not a random failure.
4. **If it's a data-consistency issue** between what the frontend shows and what you'd expect, consider the shared-database schema divergence (Known Issues item 4) before assuming it's a display bug.
5. **If Python tests are involved**, remember 2 of 4 test files won't even collect (missing `chatbot_agent` module) and one test hangs rather than failing — don't spend time debugging "why did the test suite not finish" without first checking whether you've hit the known hang.

## 7. Rollback procedure

No automated rollback mechanism (unlike `workflow-blackhole`'s CI/CD-driven one) exists in this repository. Manual rollback is: redeploy from a previous git commit/tag using whatever deploy mechanism is actually in use for each component (see §1) — confirm the specific mechanism with the team, since it isn't fully defined in this repo for either backend.

## 8. Automated test coverage — what actually exists

- **Python backend:** `pytest tests/` — 2 of 4 files collect and mostly pass (one test hangs); 2 fail to collect entirely (missing module). See `07_KNOWN_ISSUES_REGISTER.md` items 6–7.
- **Node backend:** **no test script exists** in `package.json` — confirmed by direct inspection (`start`, `dev`, `seed` are the only scripts defined). There is currently no automated regression safety net for this backend at all.
- **Frontend:** an ESLint script exists (`npm run lint`); no test runner script was found.

## 9. Third-party services to have credentials/dashboard access for, operationally

MongoDB Atlas (shared by both backends), Google Maps, Office 365, whatever LLM provider is configured, and — operationally important — whoever administers the actual production URL for Niyantran, since that value directly determines whether 23 of this repo's own endpoints work.
