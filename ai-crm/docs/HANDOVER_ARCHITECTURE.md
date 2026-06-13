# SETU ARCHITECTURE HANDOVER
## TECHNICAL ARCHITECTURE DOCUMENTATION

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Audience:** Technical System Owner  
**Classification:** Internal Technical Documentation

---

## TABLE OF CONTENTS

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Services and Modules](#4-services-and-modules)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Middleware Stack](#7-middleware-stack)
8. [Integration Architecture](#8-integration-architecture)
9. [Runtime Flow](#9-runtime-flow)
10. [Architecture Diagrams](#10-architecture-diagrams)

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TANTRA ECOSYSTEM                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Niyantran │  │ Sampada  │  │  Artha   │  │   CRM    │   │
│  │(Workflow)│  │(Signals) │  │(Business)│  │(Customer)│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       │             │              │             │          │
│       ▼             ▼              ▼             ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    SETU RUNTIME                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │         Trace Continuity Validator           │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                      │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │  │
│  │  │  Signal    │  │ Niyantran   │  │  Contract    │ │  │
│  │  │ Ingestion  │  │ Integration │  │ Validation   │ │  │
│  │  └────────────┘  └─────────────┘  └──────────────┘ │  │
│  │                                                      │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │  │
│  │  │  Bucket    │  │ Telemetry   │  │   Failure    │ │  │
│  │  │  Lineage   │  │   Layer     │  │   Handler    │ │  │
│  │  └────────────┘  └─────────────┘  └──────────────┘ │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │         UI Visibility Service                │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │   MongoDB       │                        │
│                  │   (6 collections)│                       │
│                  └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend Framework:** FastAPI (Python 3.8+)
- **Database:** MongoDB (async with motor)
- **Authentication:** JWT (JSON Web Tokens)
- **API Protocol:** REST over HTTP/HTTPS
- **Middleware:** Custom trace continuity middleware
- **Data Format:** JSON
- **Hashing:** SHA-256 for lineage/determinism

---

## 2. FRONTEND ARCHITECTURE

### Current Status
**SETU currently has NO dedicated frontend.** It exposes REST APIs meant to be consumed by:
1. TANTRA ecosystem dashboards
2. Custom monitoring tools
3. Direct API consumers

### Planned Frontend (Future)
- **Technology:** React or Vue.js
- **Communication:** REST API (may upgrade to GraphQL)
- **Real-time Updates:** WebSocket support planned
- **Dashboard Features:**
  - Execution timeline visualization
  - Signal severity heatmaps
  - Trace continuity graph
  - Contract validation reports

### UI Visibility Service
Located in `backend/setu/ui_visibility_service.py`, this service provides:
- Candidate state aggregation
- Task state visibility
- Signal visibility by severity
- Execution timeline formatting
- Dashboard-ready data structures

**Note:** This service prepares data for frontend consumption but does NOT render UI.

---

## 3. BACKEND ARCHITECTURE

### Framework: FastAPI

**Entry Point:** `backend/api_app.py`

```python
# SETU initialization in api_app.py
try:
    from setu.mongo_store import MongoSetuStore
    from setu.trace_continuity import TraceContinuityValidator
    from setu.trace_continuity_middleware import TraceContinuityMiddleware
    from setu.sovereign_routing_adapter import SovereignRoutingAdapter
    from setu.bucket_lineage_adapter import BucketLineageAdapter
    from setu.telemetry_layer import TelemetryLayer
    from setu.signal_ingestion import SignalIngestionModule
    from setu.niyantran_integration_adapter import NiyantranIntegrationAdapter
    from setu.contract_validation import ContractValidator
    from setu.failure_handler import FailureHandler
    from setu.ui_visibility_service import SetuUIVisibilityService
    from setu.routes import create_setu_router
    
    # Initialize components
    setu_store = MongoSetuStore()
    trace_validator = TraceContinuityValidator(setu_store)
    # ... (see api_app.py for full initialization)
    
    # Add middleware
    app.add_middleware(
        TraceContinuityMiddleware,
        validator=trace_validator,
        path_prefix="/setu"
    )
    
    # Include router
    app.include_router(setu_router)
except Exception as e:
    print(f"[WARNING] SETU integration failed: {e}")
```

### Backend Structure

```
backend/
├── api_app.py              # Main FastAPI application
├── setu/                   # SETU core modules
│   ├── __init__.py
│   ├── routes.py           # API endpoint definitions
│   ├── mongo_store.py      # MongoDB data access layer
│   ├── signal_ingestion.py
│   ├── trace_continuity.py
│   ├── trace_continuity_middleware.py
│   ├── sovereign_routing_adapter.py
│   ├── bucket_lineage_adapter.py
│   ├── telemetry_layer.py
│   ├── niyantran_integration_adapter.py
│   ├── contract_validation.py
│   ├── failure_handler.py
│   ├── ui_visibility_service.py
│   └── utils.py            # Hash computation utilities
├── database/
│   └── mongodb_connection.py
└── auth_system.py          # JWT authentication system
```

---

## 4. SERVICES AND MODULES

### Core Module Ownership

| Module | File | Owner | Purpose | Critical? |
|--------|------|-------|---------|-----------|
| Signal Ingestion | `signal_ingestion.py` | SETU Team | Validate and ingest Sampada signals | ✅ Yes |
| Trace Continuity | `trace_continuity.py` | SETU Team | Enforce trace immutability | ✅ Yes |
| Niyantran Integration | `niyantran_integration_adapter.py` | SETU Team | Consume Niyantran state | ✅ Yes |
| Contract Validation | `contract_validation.py` | SETU Team | Validate inter-system contracts | ✅ Yes |
| Bucket Lineage | `bucket_lineage_adapter.py` | SETU Team | Verify Bucket history | ✅ Yes |
| Telemetry Layer | `telemetry_layer.py` | SETU Team | Emit observability events | ⚠️ Important |
| Failure Handler | `failure_handler.py` | SETU Team | Handle validation failures | ⚠️ Important |
| UI Visibility | `ui_visibility_service.py` | SETU Team | Format data for dashboards | ⚠️ Important |
| MongoDB Store | `mongo_store.py` | SETU Team | Data access layer | ✅ Yes |
| Routes | `routes.py` | SETU Team | API endpoint definitions | ✅ Yes |

### Module Dependencies

```
routes.py
├── trace_continuity.py
│   └── mongo_store.py
│       └── database/mongodb_connection.py
├── signal_ingestion.py
│   ├── mongo_store.py
│   └── telemetry_layer.py
│       └── mongo_store.py
├── niyantran_integration_adapter.py
│   └── mongo_store.py
├── contract_validation.py
├── bucket_lineage_adapter.py
│   └── mongo_store.py
├── failure_handler.py
│   └── mongo_store.py
└── ui_visibility_service.py
    ├── mongo_store.py
    └── niyantran_integration_adapter.py
```

### Critical Files

**DO NOT MODIFY WITHOUT REVIEW:**
- `trace_continuity.py` - Core trace validation logic
- `signal_ingestion.py` - Signal schema validation
- `mongo_store.py` - Database operations
- `routes.py` - API contracts

**SAFE TO EXTEND:**
- `ui_visibility_service.py` - Add new dashboard endpoints
- `failure_handler.py` - Add new failure scenarios
- `utils.py` - Add utility functions

**DEPRECATED/UNUSED:**
- None currently (all modules are active)

---

## 5. DATABASE ARCHITECTURE

### MongoDB Collections

SETU uses **6 MongoDB collections**:

| Collection | Purpose | Data Retention | Critical? |
|------------|---------|----------------|-----------|
| `setu_trace_lineage` | Store execution trace records | Permanent | ✅ Yes |
| `setu_trace_logs` | Event logs for debugging | 90 days | ⚠️ Important |
| `setu_telemetry_events` | Observability events | 90 days | ⚠️ Important |
| `setu_lineage_events` | Append-only lineage chain | Permanent | ✅ Yes |
| `setu_signal_ingestion` | Ingested Sampada signals | 90 days | ✅ Yes |
| `setu_visibility_records` | Niyantran state snapshots | 90 days | ⚠️ Important |

### Collection Schemas

#### 1. setu_trace_lineage
```javascript
{
  "_id": ObjectId,
  "execution_id": String (indexed),
  "trace_id": String (indexed),
  "tenant_id": String (indexed),
  "root_trace_id": String,
  "parent_execution_id": String,
  "lineage_hash": String,
  "seen_at": ISODate,
  "source_system": String,
  "intent_type": String
}
```

#### 2. setu_signal_ingestion
```javascript
{
  "_id": ObjectId,
  "ingestion_id": String,
  "trace_id": String (indexed),
  "entity_id": String,
  "event_type": String,
  "signal_type": String, // "execution", "monitoring", "alert", "status"
  "severity": String,    // "low", "medium", "high", "critical"
  "timestamp": ISODate,
  "tenant_id": String (indexed),
  "payload": Object,
  "ingested_at": ISODate,
  "status": String
}
```

#### 3. setu_lineage_events
```javascript
{
  "_id": ObjectId,
  "lineage_event_id": String,
  "execution_id": String,
  "trace_id": String (indexed),
  "tenant_id": String (indexed),
  "event_type": String,
  "timestamp": ISODate,
  "sequence": Number,
  "payload": Object,
  "determinism_hash": String
}
```

#### 4. setu_visibility_records
```javascript
{
  "_id": ObjectId,
  "record_type": String, // "task_state", "submission_state", "execution_status"
  "trace_id": String (indexed),
  "tenant_id": String (indexed),
  "task_id": String (optional),
  "submission_id": String (optional),
  "execution_id": String (optional),
  "state": String,
  "status": String,
  "timestamp": ISODate,
  "metadata": Object,
  "consumed_at": ISODate,
  "source": String // "niyantran"
}
```

### Database Indexes

**Required indexes for performance:**

```javascript
// setu_trace_lineage
db.setu_trace_lineage.createIndex({ "execution_id": 1 }, { unique: true })
db.setu_trace_lineage.createIndex({ "trace_id": 1, "tenant_id": 1 })

// setu_signal_ingestion
db.setu_signal_ingestion.createIndex({ "trace_id": 1, "ingested_at": -1 })
db.setu_signal_ingestion.createIndex({ "tenant_id": 1, "severity": 1 })

// setu_lineage_events
db.setu_lineage_events.createIndex({ "trace_id": 1, "sequence": 1 })

// setu_visibility_records
db.setu_visibility_records.createIndex({ "trace_id": 1, "record_type": 1, "consumed_at": -1 })
```

---

## 6. AUTHENTICATION & AUTHORIZATION

### JWT Authentication

SETU endpoints are protected by JWT tokens issued by the main authentication system.

**Implementation:** `backend/auth_system.py`

```python
# All SETU endpoints require authentication
@router.post("/setu/signals/ingest")
async def ingest_sampada_signal(
    signal_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)  # <-- JWT validation
):
    # ... endpoint logic
```

### Authorization Model

**SETU uses permission-based authorization:**

| Endpoint Pattern | Required Permission | Purpose |
|-----------------|---------------------|---------|
| `POST /setu/signals/ingest` | `read:setu` or higher | Ingest signals |
| `GET /setu/signals/*` | `read:setu` | Retrieve signals |
| `POST /setu/niyantran/*` | `read:setu` | Consume Niyantran state |
| `GET /setu/ui/*` | `read:setu` | UI visibility |
| `POST /setu/test/failures` | `admin` | Testing only |

**Tenant Isolation:**
- Users can only access data for their `tenant_id`
- Admin users can access all tenants (for support/debugging)

---

## 7. MIDDLEWARE STACK

### Trace Continuity Middleware

**File:** `backend/setu/trace_continuity_middleware.py`

**Purpose:** Intercept SETU requests and validate trace continuity BEFORE reaching endpoint handlers.

```python
class TraceContinuityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, validator: TraceContinuityValidator, path_prefix: str = "/setu"):
        super().__init__(app)
        self.validator = validator
        self.path_prefix = path_prefix
    
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith(self.path_prefix):
            # Extract execution contract from request
            execution = extract_execution(await request.json())
            
            if execution:
                # Validate trace continuity
                try:
                    validated = await self.validator.validate(execution)
                    request.state.setu_execution = validated
                except TraceContinuityError as e:
                    return JSONResponse(status_code=e.status_code, content=e.payload())
        
        return await call_next(request)
```

**Middleware Order:**
1. CORS middleware (FastAPI)
2. Security headers middleware
3. TraceContinuityMiddleware (SETU)
4. JWT authentication (Depends)
5. Endpoint handler

---

## 8. INTEGRATION ARCHITECTURE

### Integration Patterns

SETU follows a **unidirectional consumption pattern**:

```
Niyantran ────┐
              │
              ▼
          ┌──────┐
Sampada ──┤ SETU ├── (observe only)
          └──────┘
              │
              ▼
           Bucket
          (verify)
```

**SETU NEVER:**
- Emits signals to Sampada
- Assigns tasks in Niyantran
- Modifies workflow state
- Creates execution contracts

### Integration Adapters

#### 1. Sovereign Routing Adapter
**File:** `sovereign_routing_adapter.py`

**Purpose:** Observe routing decisions without executing

```python
class SovereignRoutingAdapter:
    def build_routing_packet(self, execution):
        # Validate gated bridge
        gated = self.gated_bridge_validator(execution)
        
        if not gated.get("ok"):
            return {"ok": False, "reason": gated.get("reason")}
        
        # Build Sarathi payload (observe-only)
        sarathi_payload = _build_sarathi_payload(execution)
        bhiv_envelope = _build_bhiv_envelope(execution, sarathi_payload)
        
        return {
            "ok": True,
            "sarathi_payload": sarathi_payload,
            "bhiv_envelope": bhiv_envelope
        }
```

#### 2. Bucket Lineage Adapter
**File:** `bucket_lineage_adapter.py`

**Purpose:** Verify execution history in Bucket WITHOUT local duplication

```python
class BucketLineageAdapter:
    async def verify_execution_history(self, execution_id, trace_id):
        # Check execution event exists
        execution_events = await self.store.list_lineage_events(trace_id)
        execution_event_found = any(...)
        
        # Check signal exists
        signal_records = await self.store.list_signal_ingestion(trace_id)
        signal_found = any(...)
        
        # Check history exists
        history_logs = await self.store.list_trace_logs(trace_id)
        history_found = len(history_logs) > 0
        
        return {
            "verified": execution_event_found and signal_found and history_found,
            "verification_details": {...}
        }
```

---

## 9. RUNTIME FLOW

### Flow 1: Signal Ingestion

```
┌─────────────┐
│  Sampada    │ (emits signal)
└──────┬──────┘
       │
       │ POST /setu/signals/ingest
       │ {
       │   "trace_id": "trace_123",
       │   "entity_id": "candidate_001",
       │   "event_type": "task_submitted",
       │   "signal_type": "execution",
       │   "severity": "medium",
       │   "timestamp": "2024-12-20T10:00:00Z",
       │   "tenant_id": "tenant_abc"
       │ }
       ▼
┌─────────────────────────────┐
│  SignalIngestionModule      │
│  1. Validate required fields│
│  2. Check severity validity │
│  3. Check signal_type       │
│  4. Validate timestamp      │
│  5. Store in MongoDB        │
│  6. Log ingestion success   │
└──────────┬──────────────────┘
           │
           ▼
    ┌─────────────┐
    │  MongoDB    │
    │  Collection:│
    │  signal_    │
    │  ingestion  │
    └─────────────┘
```

### Flow 2: Niyantran State Consumption

```
┌─────────────┐
│  Niyantran  │ (workflow engine)
└──────┬──────┘
       │
       │ POST /setu/niyantran/task-state
       │ {
       │   "task_id": "task_001",
       │   "trace_id": "trace_123",
       │   "tenant_id": "tenant_abc",
       │   "state": "in_progress",
       │   "timestamp": "2024-12-20T10:05:00Z"
       │ }
       ▼
┌─────────────────────────────┐
│ NiyantranIntegrationAdapter │
│  1. Validate required fields│
│  2. Create visibility record│
│  3. Store in MongoDB        │
└──────────┬──────────────────┘
           │
           ▼
    ┌─────────────┐
    │  MongoDB    │
    │  Collection:│
    │  visibility_│
    │  records    │
    └─────────────┘
```

### Flow 3: UI Visibility Query

```
┌─────────────┐
│ Dashboard   │
└──────┬──────┘
       │
       │ GET /setu/ui/dashboard/trace_123
       ▼
┌─────────────────────────────┐
│  SetuUIVisibilityService    │
│  1. Get candidate state     │
│  2. Get task state          │
│  3. Get signal visibility   │
│  4. Get severity dashboard  │
│  5. Build execution timeline│
│  6. Format for UI           │
└──────────┬──────────────────┘
           │
           ▼
    ┌─────────────┐
    │  Response   │
    │  {          │
    │   "trace_id"│
    │   "candidate│
    │   _state",  │
    │   "timeline"│
    │   ...       │
    │  }          │
    └─────────────┘
```

### Flow 4: Contract Validation

```
┌─────────────┐
│  External   │
│  System     │
└──────┬──────┘
       │
       │ POST /setu/contract/validate
       │ {
       │   "niyantran_event": {...},
       │   "sampada_signal": {...},
       │   "setu_ingestion": {...}
       │ }
       ▼
┌─────────────────────────────┐
│  ContractValidator          │
│  1. Validate Niy→Sam        │
│     - trace_id match        │
│     - entity_id match       │
│     - timestamp chronology  │
│  2. Validate Sam→SETU       │
│     - All fields preserved  │
│  3. Log validation result   │
└──────────┬──────────────────┘
           │
           ▼ (if valid)
    ┌─────────────┐
    │  Success    │
    │  Response   │
    └─────────────┘
           │
           ▼ (if invalid)
    ┌─────────────┐
    │  Rejection  │
    │  with       │
    │  violations │
    └─────────────┘
```

---

## 10. ARCHITECTURE DIAGRAMS

### Component Interaction Diagram

```
                      ┌─────────────────┐
                      │   API Gateway   │
                      │   (FastAPI)     │
                      └────────┬────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
        ┌───────▼─────┐ ┌─────▼──────┐ ┌────▼─────┐
        │  Signal     │ │ Niyantran  │ │ Contract │
        │ Ingestion   │ │ Integration│ │ Validator│
        └───────┬─────┘ └─────┬──────┘ └────┬─────┘
                │              │              │
                └──────────────┼──────────────┘
                               │
                   ┌───────────▼───────────┐
                   │   Trace Continuity    │
                   │      Validator        │
                   └───────────┬───────────┘
                               │
                   ┌───────────▼───────────┐
                   │    MongoDB Store      │
                   │   (Data Access Layer) │
                   └───────────┬───────────┘
                               │
                   ┌───────────▼───────────┐
                   │      MongoDB          │
                   │   (6 collections)     │
                   └───────────────────────┘
```

### Data Flow Diagram

```
[Sampada Signal] ──┐
                   │
                   ▼
             ┌─────────┐
             │  Ingest │
             │ Validate│
             └────┬────┘
                  │
                  ▼
         ┌────────────────┐
         │ Store Signal   │
         │ in MongoDB     │
         └────┬───────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Emit Telemetry      │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Update UI Visibility│
    └─────────────────────┘
```

### Deployment Diagram

```
┌────────────────────────────────────────────┐
│           Production Environment            │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │     FastAPI Application Server        │ │
│  │     (Uvicorn/Gunicorn)                │ │
│  │                                        │ │
│  │  ┌─────────────────────────────────┐  │ │
│  │  │       SETU Runtime              │  │ │
│  │  │  - Trace Continuity Middleware  │  │ │
│  │  │  - Signal Ingestion Module      │  │ │
│  │  │  - Niyantran Adapter            │  │ │
│  │  │  - Contract Validator           │  │ │
│  │  │  - UI Visibility Service        │  │ │
│  │  └─────────────────────────────────┘  │ │
│  └──────────────┬───────────────────────┘ │
│                 │                          │
│                 │ TCP/IP                   │
│                 ▼                          │
│  ┌──────────────────────────────────────┐ │
│  │       MongoDB Cluster                │ │
│  │  - setu_trace_lineage                │ │
│  │  - setu_signal_ingestion             │ │
│  │  - setu_lineage_events               │ │
│  │  - setu_telemetry_events             │ │
│  │  - setu_trace_logs                   │ │
│  │  - setu_visibility_records           │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

---

## CRITICAL NOTES FOR NEW OWNER

### Build & Entry Points

1. **Main Entry:** `backend/api_app.py`
2. **SETU Router:** Created in `backend/setu/routes.py` via `create_setu_router()`
3. **Middleware:** Added in `api_app.py` during startup
4. **Build:** No compilation required (Python)
5. **Startup:** `uvicorn api_app:app --host 0.0.0.0 --port 8000`

### Critical Paths to Understand

1. **Request Flow:** Middleware → Routes → Service → Store → MongoDB
2. **Validation Chain:** Middleware validates trace → Service validates payload → Store persists
3. **Error Handling:** Each layer can raise specific exceptions with proper HTTP codes

### Dangerous Areas

- **mongo_store.py:** Changes here affect ALL modules
- **trace_continuity.py:** Core validation logic - test thoroughly
- **MongoDB indexes:** Dropping indexes will cause performance degradation

### Safe to Modify

- **ui_visibility_service.py:** Add new dashboard endpoints
- **failure_handler.py:** Add new failure scenarios
- **routes.py:** Add new API endpoints (follow existing patterns)

---

## NEXT STEPS

1. Review `HANDOVER_REPOSITORY_MAP.md` for file-level details
2. Review `HANDOVER_API_AND_CONTRACTS.md` for API specifications
3. Set up local development environment (see `HANDOVER_RUNBOOK.md`)
4. Trace a sample signal through the system end-to-end

---

**END OF ARCHITECTURE HANDOVER**
