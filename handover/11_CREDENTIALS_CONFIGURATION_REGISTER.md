# Credentials & Configuration Register — ai-crm (CRM + Logistics + SETU)

**No secret values appear in this document.**

## 1. Where configuration lives

| Location | Contents | Notes |
|---|---|---|
| `backend/.env` | Python backend config (34 variables) | Present in the reviewed copy — real values, not placeholders |
| `backend/.env.example` | Template | Exists; not cross-checked variable-by-variable against actual code usage in this pass the way `workflow-blackhole`'s was — recommend the same audit technique be applied here if time allows |
| `backend-nodejs/.env` | Node backend config (20 variables) | Present, real values |
| `backend-nodejs/.env.example` | Template | Exists |
| `frontend/` | No `.env` file found in this review; `VITE_API_URL` etc. read from `import.meta.env`, defaulting to `localhost` values baked into the code | Confirm the real production build's env values with whoever last built/deployed the frontend |

## 2. Python backend — variables by category

| Category | Variables |
|---|---|
| Server | `API_HOST`, `API_PORT`, `DASHBOARD_PORT`, `ENVIRONMENT`, `DEBUG`, `LOG_LEVEL` |
| Database | `MONGODB_URL`, `MONGODB_DATABASE`, `DATABASE_URL` (legacy SQLite, see Known Issues), `DATABASE_TYPE` |
| Auth | `JWT_SECRET_KEY` (⚠ see Known Issues item 1 — no startup guard), `JWT_ALGORITHM`, `JWT_EXPIRATION_HOURS`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `ENABLE_EMAIL_NOTIFICATIONS` |
| Ecosystem integration | `INFIVERSE_BASE_URL` (⚠ see Known Issues item 2 — set to localhost), `INFIVERSE_ENABLED`, `SAMPADA_SETU_API_KEY`, `SAMPADA_SETU_BASE_URL`, `SAMPADA_SETU_ENABLED`, `SAMPADA_SETU_TIMEOUT_S` |
| Business logic tuning | `AGENT_INTERVAL`, `AUTO_APPROVAL_ENABLED`, `CONFIDENCE_THRESHOLD`, `ENABLE_HUMAN_REVIEW`, `ENABLE_MONITORING`, `ENABLE_SMART_CHATBOT`, `COMPANY_NAME`, `COMPANY_EMAIL` |

## 3. Node backend — variables by category

| Category | Variables |
|---|---|
| Server | `PORT`, `NODE_ENV`, `CORS_ORIGINS` |
| Database | `MONGODB_URL` (**confirmed identical to the Python backend's**, see `05_DATABASE_GUIDE.md`) |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| Admin seed account | `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` — used by `npm run seed` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` |
| Ecosystem integration (declared, not used) | `SAMPADA_SETU_API_KEY`, `SAMPADA_SETU_BASE_URL`, `SAMPADA_SETU_ENABLED`, `SAMPADA_SETU_CORRELATION_ID`, `SAMPADA_SETU_TIMEOUT_S` — **verified: not referenced anywhere in this backend's actual source code** (grep across `src/` found zero hits). Likely copied from the Python backend's `.env` template as ecosystem-wide boilerplate rather than something this specific service uses. Not harmful, just not functional here. |

## 4. Certificates

No certificate files or SSL configuration were found in this repository for either backend — unlike `workflow-blackhole`'s dedicated production proxy config. Confirm with whoever hosts these services where/how TLS is actually terminated.

## 5. Service accounts

No dedicated service-account credential files (e.g. GCP/AWS JSON keys) were found; Google Maps and Office 365 access appear to be simple API-key-based per the `.env` variable names, not service-account-based — confirm this is accurate with whoever set those integrations up.

## 6. Access requirements — who needs what, to do what

| Task | Access needed |
|---|---|
| Run either backend locally | The corresponding `.env` with valid values |
| Fix the `INFIVERSE_BASE_URL` production gap | Whoever deploys the Python backend, plus the real production Niyantran URL (ask whoever owns `workflow-blackhole`'s deployment) |
| Administer the shared MongoDB Atlas database | Atlas project access — same credentials/project referenced by `workflow-blackhole` are **not** the same cluster (different cluster ID: `cluster0.7c16heb` here vs. a different one for `workflow-blackhole`), so this is a separate access grant even though the naming looks similar |
| Rotate `JWT_SECRET_KEY` (Python) or `JWT_SECRET` (Node) | Whoever owns each `.env`'s deployment target — remember the Python one has no startup guard, so a rotation that accidentally unsets the variable will fail silently rather than loudly |

## 7. Immediate action recommended

1. Fix `INFIVERSE_BASE_URL` for whatever environment is actually production — this is a live, verified gap, not a theoretical one.
2. Add a startup guard for `JWT_SECRET_KEY` in the Python backend, then rotate it away from the current placeholder-looking value.
3. Confirm with the team whether the `SAMPADA_SETU_*` variables in the Node backend's `.env` are meant to be wired up eventually, or should just be removed to reduce configuration surface area.
