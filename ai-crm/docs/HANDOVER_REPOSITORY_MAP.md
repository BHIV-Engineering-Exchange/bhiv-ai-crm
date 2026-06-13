# SETU REPOSITORY MAP
## FILE AND DIRECTORY STRUCTURE GUIDE

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Purpose:** Navigate SETU codebase safely  

---

## REPOSITORY STRUCTURE

```
ai-crm/
├── backend/
│   ├── setu/                    # SETU CORE MODULES
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── mongo_store.py
│   │   ├── signal_ingestion.py
│   │   ├── trace_continuity.py
│   │   ├── trace_continuity_middleware.py
│   │   ├── sovereign_routing_adapter.py
│   │   ├── bucket_lineage_adapter.py
│   │   ├── telemetry_layer.py
│   │   ├── niyantran_integration_adapter.py
│   │   ├── contract_validation.py
│   │   ├── failure_handler.py
│   │   ├── ui_visibility_service.py
│   │   └── utils.py
│   ├── database/
│   │   └── mongodb_connection.py
│   ├── api_app.py              # Main FastAPI app (SETU integrated here)
│   └── auth_system.py
├── docs/                        # HANDOVER DOCUMENTATION
│   ├── HANDOVER_EXECUTIVE_OVERVIEW.md
│   ├── HANDOVER_ARCHITECTURE.md
│   ├── HANDOVER_REPOSITORY_MAP.md (this file)
│   ├── HANDOVER_API_AND_CONTRACTS.md
│   ├── HANDOVER_CURRENT_STATE.md
│   ├── HANDOVER_INTEGRATION_MAP.md
│   ├── HANDOVER_RUNBOOK.md
│   ├── HANDOVER_KNOWLEDGE_DUMP.md
│   ├── HANDOVER_OPEN_WORK.md
│   ├── OWNER_TRANSFER_PACKET.md
│   └── REVIEW_PACKET.md
└── ai-crm/                      # Root documentation
    ├── SETU_FLOW_PROOF.md
    ├── TRACE_CONTINUITY_PROOF.md
    ├── TELEMETRY_PROOF.md
    ├── LINEAGE_EMISSION_PROOF.md
    ├── CONVERGENCE_GAPS.md
    └── REVIEW_PACKET.md
```

---

## FOLDER-BY-FOLDER BREAKDOWN

### `/backend/setu/` - SETU Core Modules

**Purpose:** All SETU runtime logic  
**Ownership:** SETU Team  
**Modification Risk:** HIGH - changes affect entire SETU system

#### Important Files

| File | Lines | Purpose | Modify Risk |
|------|-------|---------|-------------|
| `__init__.py` | 2 | Module marker | LOW |
| `routes.py` | 350 | API endpoint definitions | MEDIUM |
| `mongo_store.py` | 120 | Database access layer | **HIGH** |
| `signal_ingestion.py` | 200 | Signal validation & ingestion | **HIGH** |
| `trace_continuity.py` | 180 | Trace validation logic | **CRITICAL** |
| `trace_continuity_middleware.py` | 80 | Request interception | **HIGH** |
| `sovereign_routing_adapter.py` | 150 | Routing observation | MEDIUM |
| `bucket_lineage_adapter.py` | 120 | Bucket verification | MEDIUM |
| `telemetry_layer.py` | 100 | Observability events | LOW |
| `niyantran_integration_adapter.py` | 180 | Niyantran state consumption | MEDIUM |
| `contract_validation.py` | 250 | Inter-system contract validation | **HIGH** |
| `failure_handler.py` | 200 | Error handling & logging | LOW |
| `ui_visibility_service.py` | 300 | Dashboard data formatting | LOW |
| `utils.py` | 40 | Hash computation utilities | MEDIUM |

---

## CRITICAL FILES (DO NOT MODIFY WITHOUT REVIEW)

### 1. `trace_continuity.py`

**Purpose:** Core trace validation - enforces immutable trace_id

**Key Functions:**
- `validate(execution)` - Main validation entry point
- `extract_execution(payload)` - Extract execution contract from payload

**Why Critical:**
- Single source of truth for trace validation rules
- Changes here affect ALL trace continuity enforcement
- Incorrect changes can break tenant isolation

**Safe Changes:**
- Add new validation rules (with tests)
- Improve error messages

**Dangerous Changes:**
- Modifying hash computation
- Removing validation checks
- Changing required fields

---

### 2. `mongo_store.py`

**Purpose:** Data access layer for all MongoDB operations

**Key Functions:**
- `upsert_trace_record()` - Store trace metadata
- `append_signal_ingestion()` - Store signal
- `append_lineage_event()` - Store lineage
- `list_*()` - Query methods

**Why Critical:**
- ALL modules depend on this for data persistence
- Changes affect performance of entire system
- Incorrect queries can corrupt data or break tenant isolation

**Safe Changes:**
- Add new query methods
- Optimize existing queries (with testing)

**Dangerous Changes:**
- Removing methods (breaks dependent modules)
- Changing collection names
- Modifying serialization logic

---

### 3. `signal_ingestion.py`

**Purpose:** Validate and ingest Sampada signals

**Key Constants:**
```python
REQUIRED_SIGNAL_FIELDS = [
    "trace_id", "entity_id", "event_type", 
    "signal_type", "severity", "timestamp", "tenant_id"
]

VALID_SEVERITIES = ["low", "medium", "high", "critical"]
VALID_SIGNAL_TYPES = ["execution", "monitoring", "alert", "status"]
```

**Why Critical:**
- Defines contract with Sampada
- Changes here break Sampada integration
- Invalid validation allows bad data into system

**Safe Changes:**
- Add new signal types (coordinate with Sampada team)
- Improve validation error messages

**Dangerous Changes:**
- Removing required fields
- Changing severity values
- Skipping validation steps

---

### 4. `routes.py`

**Purpose:** Define all SETU API endpoints

**Why Critical:**
- Defines public API contract
- Changes here affect all API consumers
- Incorrect authorization can expose sensitive data

**Safe Changes:**
- Add new endpoints (following existing patterns)
- Add query parameters to GET endpoints

**Dangerous Changes:**
- Changing endpoint URLs (breaks clients)
- Removing endpoints (breaks integrations)
- Modifying request/response schemas

---

## SAFE TO MODIFY FILES

### 1. `ui_visibility_service.py`

**Purpose:** Format data for dashboard consumption

**Safe Changes:**
- Add new dashboard endpoints
- Add new data aggregations
- Improve data formatting
- Add caching for performance

**Why Safe:**
- No impact on data persistence
- No impact on validation logic
- Easy to test in isolation

---

### 2. `failure_handler.py`

**Purpose:** Handle and log validation failures

**Safe Changes:**
- Add new failure scenarios
- Improve error messages
- Add metrics/monitoring
- Add retry logic

**Why Safe:**
- Only triggered on errors
- No impact on happy path
- Easy to test

---

### 3. `telemetry_layer.py`

**Purpose:** Emit observability events

**Safe Changes:**
- Add new event types
- Add more details to events
- Add metrics

**Why Safe:**
- Observability only (no business logic)
- Failures don't block operations
- Easy to test

---

## DANGEROUS AREAS (MODIFY WITH EXTREME CAUTION)

### MongoDB Indexes

**Location:** Not in code (manual DB commands)

**Current Indexes:**
```javascript
db.setu_trace_lineage.createIndex({ "execution_id": 1 }, { unique: true })
db.setu_trace_lineage.createIndex({ "trace_id": 1, "tenant_id": 1 })
db.setu_signal_ingestion.createIndex({ "trace_id": 1, "ingested_at": -1 })
```

**Why Dangerous:**
- Dropping indexes causes severe performance degradation
- Changing unique constraints can cause write failures
- Index creation locks collections

**Before Modifying:**
1. Test on staging environment
2. Check query patterns in code
3. Plan for zero-downtime migration

---

### Hash Computation (`utils.py`)

**Functions:**
- `compute_lineage_hash()` - Computes deterministic hash for lineage
- `compute_determinism_hash()` - Computes hash for replay

**Why Dangerous:**
- Changing hash algorithm breaks replay functionality
- Lineage verification depends on stable hashing
- Historical data becomes unverifiable

**Never:**
- Change hash algorithm (SHA-256)
- Change field ordering
- Change serialization format

---

## DEAD CODE / DEPRECATED AREAS

**Current Status:** NONE

All files in `backend/setu/` are actively used. No deprecated code exists.

**If you find dead code:**
1. Confirm with team before removing
2. Check git history for removal reason
3. Remove in separate commit with clear message

---

## TECHNICAL DEBT

### Known Shortcuts

1. **Gated Bridge Validator** (`sovereign_routing_adapter.py`)
   - Currently uses default validator (placeholder)
   - Should integrate with Artha policy engine
   - **Risk:** Medium - not enforcing live policies

2. **External Event Streaming**
   - Currently stores events in MongoDB only
   - Should stream to Kafka/EventHub for real-time dashboards
   - **Risk:** Low - functionality works, just not optimal

3. **Rate Limiting**
   - SETU endpoints have no rate limiting
   - Should add per-tenant rate limits
   - **Risk:** Medium - can be abused

4. **Circuit Breakers**
   - No circuit breakers for MongoDB failures
   - Should add graceful degradation
   - **Risk:** High - cascading failures possible

---

## KNOWN WORKAROUNDS

### 1. Sync vs Async MongoDB

**Issue:** Some parts of codebase use sync MongoDB, SETU uses async

**Workaround:** MongoSetuStore wraps async operations

**Proper Fix:** Convert entire codebase to async MongoDB

**Location:** `mongo_store.py`, `database/mongodb_connection.py`

---

### 2. Manual Middleware Registration

**Issue:** SETU middleware must be manually added to `api_app.py`

**Workaround:** Documented in initialization section

**Proper Fix:** Auto-discovery of SETU modules

**Location:** `api_app.py` lines 320-360

---

## FILE NAVIGATION GUIDE

### "I want to..."

#### Add a new API endpoint
1. Open `routes.py`
2. Add function decorated with `@router.get()` or `@router.post()`
3. Follow existing patterns for authentication
4. Test with `/docs` Swagger UI

#### Change signal validation rules
1. Open `signal_ingestion.py`
2. Modify `REQUIRED_SIGNAL_FIELDS` or add validation in `_validate_signal_payload()`
3. **Coordinate with Sampada team**
4. Add tests

#### Add new dashboard data
1. Open `ui_visibility_service.py`
2. Add new method following pattern of existing methods
3. Add route in `routes.py` under "PHASE 7" section

#### Fix a database query
1. Open `mongo_store.py`
2. Locate relevant method (e.g., `list_signal_ingestion()`)
3. Test query in MongoDB shell first
4. Update method and add unit test

#### Debug trace continuity failure
1. Check `setu_trace_logs` collection for failure events
2. Open `trace_continuity.py` to understand validation rules
3. Use `/setu/test/failures` endpoint to reproduce
4. Check `failure_handler.py` for logged details

---

## TESTING FILES (NOT IN REPO)

**Current Status:** No dedicated test files exist

**Recommended Structure:**
```
backend/
├── setu/
│   └── tests/
│       ├── test_signal_ingestion.py
│       ├── test_trace_continuity.py
│       ├── test_contract_validation.py
│       └── test_ui_visibility.py
```

**Priority:** HIGH - add tests before making significant changes

---

## BUILD & DEPLOYMENT FILES

### Requirements
**File:** `backend/requirements.txt` (main project)

**SETU Dependencies:**
```
fastapi>=0.104.0
motor>=3.3.0  # Async MongoDB
pydantic>=2.0.0
pymongo>=4.5.0
```

### Entry Point
**File:** `backend/api_app.py`

**SETU Initialization:** Lines 320-360 (search for "Initialize SETU")

---

## CONFIGURATION FILES

**Current Status:** No dedicated SETU config file

**Configuration via:**
- Environment variables (`MONGODB_URL`)
- Hard-coded constants in modules
- `database/mongodb_connection.py` for DB config

**Recommendation:** Create `setu_config.py` with:
```python
SETU_CONFIG = {
    "SIGNAL_VALIDATION_STRICT": True,
    "TRACE_CONTINUITY_ENFORCE": True,
    "TELEMETRY_ENABLED": True,
    "MAX_LINEAGE_EVENTS": 10000,
    "DEFAULT_QUERY_LIMIT": 200
}
```

---

## LOGGING & MONITORING

**Location:** Scattered across modules (needs consolidation)

**Current Logging:**
- `print()` statements in initialization
- `store.append_trace_log()` for SETU events
- No structured logging framework

**Recommendation:** Add structured logging:
```python
import logging
logger = logging.getLogger("setu")
```

---

## SECURITY CONSIDERATIONS

### Files with Security Impact

1. **`auth_system.py`** - JWT validation
2. **`trace_continuity.py`** - Tenant isolation
3. **`mongo_store.py`** - Data access control
4. **`routes.py`** - Authorization checks

### Never Commit

- MongoDB connection strings with credentials
- JWT secret keys
- API keys for external services

---

## QUICK REFERENCE CHEAT SHEET

| Task | File | Function/Section |
|------|------|------------------|
| Add endpoint | `routes.py` | Add `@router` method |
| Change validation | `signal_ingestion.py` | Modify `_validate_signal_payload()` |
| Query data | `mongo_store.py` | Add new `list_*()` method |
| Handle error | `failure_handler.py` | Add new handler method |
| Format UI data | `ui_visibility_service.py` | Add new visibility method |
| Debug trace | `trace_continuity.py` | Check validation logic |
| Check integration | `niyantran_integration_adapter.py` | Review adapter methods |

---

**END OF REPOSITORY MAP**
