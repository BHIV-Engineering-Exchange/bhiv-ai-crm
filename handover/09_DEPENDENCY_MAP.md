# Dependency Map — ai-crm (CRM + Logistics + SETU)

## 1. Internal dependencies (within this repo)

```
frontend/  →  depends on  →  backend-nodejs/  (18 of 19 API service files)
frontend/src/pages/Infiverse.jsx  →  depends on  →  workflow-blackhole production API DIRECTLY
                                                       (bypasses both of this repo's own backends)
backend/ (Python)  →  depends on  →  MongoDB Atlas, Google Maps, Office 365, LLM provider,
                                        Niyantran (via INFIVERSE_BASE_URL proxy layer — currently
                                        misconfigured, see Known Issues)
backend-nodejs/  →  depends on  →  MongoDB Atlas (same database as the Python backend)
setu/ (inside backend/)  →  depends on  →  Niyantran (niyantran_integration_adapter.py),
                                              contract-compatible with Sampada (no direct call found)
```

Both backends are independent Node/Python processes with their own `package.json`/`requirements.txt` — there is no internal package boundary between them, only the shared MongoDB database (see `05_DATABASE_GUIDE.md` for why that's a real risk, not just an implementation detail).

## 2. External (third-party) dependencies

| Service | Used by | Required for core function? |
|---|---|---|
| MongoDB Atlas | Both backends | Yes |
| Google Maps API | Python backend | No — degrades gracefully |
| Office 365 API | Python backend | Only for those specific features |
| LLM provider (OpenAI/etc.) | Both backends (each has its own LLM-query integration) | Only for AI/LLM query features |
| npm / PyPI registries | Both, at build time | Yes, at build/install time |

## 3. Ecosystem (cross-repository) dependencies — per `ECOSYSTEM_REPOSITORY_MAP.md`, verified in code

| System | Relationship to ai-crm |
|---|---|
| **workflow-blackhole (Niyantran)** | **Confirmed live, multi-point dependency** — three separate integration paths found: (1) the frontend's `Infiverse.jsx` calls Niyantran's production API directly from the browser; (2) `backend/api_app.py`'s 23-endpoint Infiverse-proxy layer forwards requests to Niyantran (currently misconfigured to point at `localhost:5000` — see Known Issues); (3) `setu/niyantran_integration_adapter.py` provides a dedicated SETU-level integration. This is by far the most tightly-coupled cross-repo relationship found in either handover package. |
| **Sampada** (`INFIVERSE-HR-PLATFORM`, not in this handover) | Contract-level relationship only — SETU here is meant to be compatible with Sampada's own SETU gateway; no direct HTTP call to Sampada was found in this codebase. |
| **Artha** | No reference found in this codebase (same conclusion as for `workflow-blackhole`). |
| **Bucket** | `setu/bucket_lineage_adapter.py` provides Bucket-verification endpoints (`/setu/bucket/*`) — code-level integration exists, though the actual external Bucket URL/credentials weren't independently traced in this pass the way they were for `workflow-blackhole`. |
| **Karma, PRANA, InsightFlow (bhiv-registry)** | No reference found in this codebase. |

## 4. Team dependencies

Per the source task and ecosystem map:

| Need | Who to ask |
|---|---|
| System ownership / handover sign-off | Shashank Mishra (owner), Rishabh Yadav (ecosystem acceptance authority) |
| Strategic placement questions | TMS |
| Governance / authority questions | GC |
| Data / schema / provenance questions | MDU — **especially relevant here** given the confirmed shared-database schema divergence (Known Issues item 4); this is exactly the kind of question MDU is positioned to resolve per the ecosystem map's own routing table |
| Niyantran production URL / integration config | Whoever owns `workflow-blackhole`'s deployment — needed to fix the `INFIVERSE_BASE_URL` gap |

## 5. Repository dependencies (build/deploy order)

1. MongoDB Atlas must be reachable before either backend will function correctly (the Python backend will start regardless, given its lazy-connection behavior, but will fail on first real query).
2. For the frontend to be useful, `VITE_API_URL` must point at whichever backend is actually meant to serve it (verified default: `backend-nodejs`).
3. For the Python backend's Infiverse-proxy endpoints to work, Niyantran must be reachable at whatever `INFIVERSE_BASE_URL` actually resolves to in that environment — currently a real, open gap.

## 6. Service dependencies (runtime call graph, summarized)

Unlike `workflow-blackhole`'s single-hub architecture, this repository has **two hubs** (the two backends) that don't call each other directly but do share state via the database — meaning an outage or bug in one backend can silently corrupt data the other backend reads, without either backend ever making a request to the other. This is a structurally different (and, in some ways, riskier) failure mode than a direct-call dependency, and is worth keeping in mind when debugging cross-backend data issues.
