# Evidence Packet — ai-crm (CRM + Logistics + SETU)

Every command below was actually run against this repository (in an isolated sandbox copy) while preparing this handover.

## 1. Static code integrity

**Python backend — syntax-checked all 135 `.py` files individually** (`python -m py_compile`):
```
Top-level: 72 files → 0 errors
setu/: 16 files → 0 errors
database/: 9 files → 0 errors
integrations/: 4 files → 0 errors
scripts/: 1 file → 0 errors
tests/: 6 files → 0 errors
BHIV_Integrator_Core/: 27 files → 0 errors
```

**Node backend — syntax-checked all 28 `.js` files individually** (`node --check`): 0 errors.

## 2. Dependency installs

```
$ cd backend && pip install -r requirements.txt --break-system-packages
[completed clean — fastapi 0.140.0, motor 3.7.1, pymongo 4.17.0, pandas 3.0.5,
 streamlit 1.60.0, uvicorn 0.51.0, and 77 others installed]

$ cd backend-nodejs && npm install
up to date, 0 errors

$ cd frontend && npm install
[clean install]
```

## 3. Boot testing — Python backend

```
$ python -c "import api_app"
[INFO] Using MongoDB database
Warning: Google Maps API key not found. Some features may not work.
[OK] Connected to MongoDB (async): ai_crm_logistics
[OK] Database service extended for customer portal and procurement
[OK] Customer Portal API routes loaded
```
**Verified the "Connected" message is misleading:** a follow-up test explicitly called `MongoDBConnection._client.admin.command('ping')` after this same startup sequence. The "[OK] Connected" line printed instantly (as part of client construction); the actual `ping` call did not return within a 20-second window — consistent with this sandbox having no network route to the real Atlas cluster, and confirming the earlier "Connected" message was not based on a real connectivity check. This is documented as Known Issues item 8.

## 4. Boot testing — Node backend

```
$ node src/server.js
Server running on port 8000 in development mode
Warning: Duplicate schema index on {"sku":1} found...
Warning: Duplicate schema index on {"orderNumber":1} found...
❌ MongoDB Connection Failed: [connection error — expected, no network route to Atlas from this sandbox]
[process exits with code 1]
```
Confirms: the app opens its HTTP listener before the DB connection resolves, and `src/config/database.js` calls `process.exit(1)` on failure — verified real behavior, not assumed.

## 5. Test suite results

**Python (`pytest tests/`):**
```
ERROR tests/test_agent.py - ModuleNotFoundError: No module named 'chatbot_agent'
ERROR tests/test_integration.py - ModuleNotFoundError: No module named 'chatbot_agent'
collected 16 items (from test_api.py + test_setu_e2e.py)
tests/test_api.py::TestAPIEndpoints::test_root_endpoint PASSED
tests/test_api.py::TestAPIEndpoints::test_get_orders_endpoint PASSED
tests/test_api.py::TestAPIEndpoints::test_get_returns_endpoint [HANGS — did not complete within 60s]
```
Confirmed via a repo-wide file search that no file named `chatbot_agent.py` exists anywhere in the repository (a similarly-named `smart_chatbot.py` does exist at the repo root).

**Node:** no test script exists in `package.json` — nothing to run.

## 6. Build verification

```
$ cd frontend && npm run build
vite v5.x building for production...
✓ built in [time]
[dist/ output produced successfully]
```

## 7. File-existence checks (the basis for several Known Issues items)

```
$ find . -iname "start_server.py"
[no output — confirmed genuinely missing, referenced by both Procfile and railway.json]

$ grep "INFIVERSE_BASE_URL" backend/.env
INFIVERSE_BASE_URL=http://localhost:5000
[confirmed local-only address in the real .env, vs. the real production Niyantran URL
 (https://blackholeworkflow.onrender.com) found elsewhere in this ecosystem]

$ grep "DATABASE_URL\|SECRET_KEY" backend/.env
DATABASE_URL=sqlite:///logistics_agent.db     [legacy value, not the real Mongo connection]
[no SECRET_KEY line — only JWT_SECRET_KEY, a different variable name]
```

## 8. Cross-backend schema comparison (the basis for Known Issues item 4 and the Database Guide's central finding)

Directly read and compared field-by-field:
```
Python ProductModel (database/mongodb_models.py):
  product_id, name, category, description, unit_price, weight_kg, dimensions,
  supplier_id, reorder_point, max_stock, is_active, created_at, updated_at, ...

Node Product.js (src/models/Product.js), extracted via script:
  name, sku, description, category, costPrice, sellingPrice, stockQuantity,
  minThreshold, unit, supplier, isActive, createdBy
```
Genuinely different field sets for what both name as the `products` collection in the identical MongoDB database (confirmed by comparing both `.env` files' `MONGODB_URL` directly).

## 9. What could and could not be verified from this sandbox — and why

Same constraint as documented in `workflow-blackhole/handover/13_EVIDENCE_PACKET.md`: this sandbox has outbound network access limited to package registries and developer-tooling domains — no route to MongoDB Atlas, Google Maps, Office 365, any LLM provider's API, or wherever these backends are actually hosted in production. Every claim about **code, configuration, and local build/test behavior** above was directly executed. Every claim about the **live production environment's current state** is based on reading the configuration that defines that behavior, not on directly observing it.

## 10. Checklist — evidence still needed from someone with live access

- [ ] Screenshot of the MongoDB Atlas `ai_crm_logistics` database, confirming both backends' collections and — ideally — direct visual confirmation of the schema divergence described in `05_DATABASE_GUIDE.md`
- [ ] Confirmation of which backend(s) are actually deployed and reachable in production right now
- [ ] Confirmation of the real, production value of `INFIVERSE_BASE_URL`
- [ ] A real end-to-end test of at least one SETU endpoint against production, to confirm the module works beyond what static analysis can show
- [ ] The recorded demonstration session outlined in `00_HANDOVER_PLAN.md` §5
