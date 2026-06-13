# SETU API & CONTRACT HANDOVER
## COMPLETE API REFERENCE & INTEGRATION CONTRACTS

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Base URL:** `http://localhost:8000/setu` (development)  
**Authentication:** JWT Bearer Token Required

---

## TABLE OF CONTENTS

1. [Authentication Model](#1-authentication-model)
2. [Signal Ingestion APIs](#2-signal-ingestion-apis)
3. [Niyantran Integration APIs](#3-niyantran-integration-apis)
4. [Contract Validation APIs](#4-contract-validation-apis)
5. [Bucket Verification APIs](#5-bucket-verification-apis)
6. [Failure Handling APIs](#6-failure-handling-apis)
7. [UI Visibility APIs](#7-ui-visibility-apis)
8. [Error Codes](#8-error-codes)
9. [Integration Contracts](#9-integration-contracts)

---

## 1. AUTHENTICATION MODEL

### JWT Token Required

All SETU endpoints require valid JWT token in Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Obtaining Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "user": {
    "user_id": "usr_123",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### Tenant Isolation

SETU enforces tenant isolation. Users can only access data for their `tenant_id`.

---

## 2. SIGNAL INGESTION APIS

### 2.1 Ingest Sampada Signal

**Endpoint:** `POST /setu/signals/ingest`

**Purpose:** Ingest signal from Sampada with validation

**Request:**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "entity_id": "candidate_001",
  "event_type": "task_submitted",
  "signal_type": "execution",
  "severity": "medium",
  "timestamp": "2024-12-20T10:00:00Z",
  "tenant_id": "tenant_abc",
  "payload": {
    "task_id": "task_001",
    "result": "pending"
  }
}
```

**Required Fields:**
- `trace_id` (string) - Immutable trace identifier
- `entity_id` (string) - Entity generating signal (e.g., candidate ID)
- `event_type` (string) - Type of event (e.g., "task_submitted")
- `signal_type` (string) - One of: `"execution"`, `"monitoring"`, `"alert"`, `"status"`
- `severity` (string) - One of: `"low"`, `"medium"`, `"high"`, `"critical"`
- `timestamp` (ISO 8601 string) - Signal generation time
- `tenant_id` (string) - Tenant identifier for isolation

**Optional Fields:**
- `payload` (object) - Additional signal data

**Success Response (200):**
```json
{
  "success": true,
  "ingestion_id": "ing_20241220_100001_abc123",
  "trace_id": "trace_20241220_100000_abc123",
  "message": "Signal ingested successfully"
}
```

**Error Response (400 - Invalid Payload):**
```json
{
  "success": false,
  "error": "missing_required_fields",
  "message": "Signal payload missing required fields",
  "details": {
    "missing_fields": ["entity_id", "severity"]
  }
}
```

**Error Response (400 - Invalid Severity):**
```json
{
  "success": false,
  "error": "invalid_severity",
  "message": "Invalid severity level",
  "details": {
    "received_severity": "urgent",
    "valid_severities": ["low", "medium", "high", "critical"]
  }
}
```

---

### 2.2 Get Ingested Signals

**Endpoint:** `GET /setu/signals/{trace_id}`

**Purpose:** Retrieve all signals for a trace

**Request:**
```http
GET /setu/signals/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "signals": [
    {
      "ingestion_id": "ing_20241220_100001_abc123",
      "trace_id": "trace_20241220_100000_abc123",
      "entity_id": "candidate_001",
      "event_type": "task_submitted",
      "signal_type": "execution",
      "severity": "medium",
      "timestamp": "2024-12-20T10:00:00Z",
      "tenant_id": "tenant_abc",
      "payload": {...},
      "ingested_at": "2024-12-20T10:00:01Z",
      "status": "ingested"
    }
  ],
  "count": 1
}
```

---

## 3. NIYANTRAN INTEGRATION APIS

### 3.1 Consume Task State

**Endpoint:** `POST /setu/niyantran/task-state`

**Purpose:** Consume task state from Niyantran for visibility

**Request:**
```json
{
  "task_id": "task_001",
  "trace_id": "trace_20241220_100000_abc123",
  "tenant_id": "tenant_abc",
  "state": "in_progress",
  "timestamp": "2024-12-20T10:05:00Z",
  "metadata": {
    "assigned_to": "worker_001",
    "priority": "high"
  }
}
```

**Required Fields:**
- `task_id` (string)
- `trace_id` (string)
- `tenant_id` (string)
- `state` (string) - Task state (e.g., "pending", "in_progress", "completed")
- `timestamp` (ISO 8601 string)

**Success Response (200):**
```json
{
  "success": true,
  "record_type": "task_state",
  "task_id": "task_001",
  "trace_id": "trace_20241220_100000_abc123"
}
```

---

### 3.2 Consume Submission State

**Endpoint:** `POST /setu/niyantran/submission-state`

**Purpose:** Consume submission state from Niyantran

**Request:**
```json
{
  "submission_id": "sub_001",
  "task_id": "task_001",
  "trace_id": "trace_20241220_100000_abc123",
  "tenant_id": "tenant_abc",
  "state": "submitted",
  "timestamp": "2024-12-20T10:10:00Z",
  "result": {
    "score": 85,
    "status": "passed"
  }
}
```

**Required Fields:**
- `submission_id` (string)
- `task_id` (string)
- `trace_id` (string)
- `tenant_id` (string)
- `state` (string)
- `timestamp` (ISO 8601 string)

**Success Response (200):**
```json
{
  "success": true,
  "record_type": "submission_state",
  "submission_id": "sub_001",
  "trace_id": "trace_20241220_100000_abc123"
}
```

---

### 3.3 Consume Execution Status

**Endpoint:** `POST /setu/niyantran/execution-status`

**Purpose:** Consume execution status from Niyantran

**Request:**
```json
{
  "execution_id": "exec_001",
  "trace_id": "trace_20241220_100000_abc123",
  "tenant_id": "tenant_abc",
  "status": "running",
  "timestamp": "2024-12-20T10:15:00Z",
  "progress": 45,
  "errors": []
}
```

**Required Fields:**
- `execution_id` (string)
- `trace_id` (string)
- `tenant_id` (string)
- `status` (string)
- `timestamp` (ISO 8601 string)

**Success Response (200):**
```json
{
  "success": true,
  "record_type": "execution_status",
  "execution_id": "exec_001",
  "trace_id": "trace_20241220_100000_abc123"
}
```

---

### 3.4 Get Execution Timeline

**Endpoint:** `GET /setu/niyantran/timeline/{trace_id}`

**Purpose:** Get complete execution timeline for visibility

**Request:**
```http
GET /setu/niyantran/timeline/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "timeline": [
    {
      "type": "task_state",
      "timestamp": "2024-12-20T10:05:00Z",
      "data": {
        "task_id": "task_001",
        "state": "in_progress",
        ...
      }
    },
    {
      "type": "submission_state",
      "timestamp": "2024-12-20T10:10:00Z",
      "data": {
        "submission_id": "sub_001",
        "state": "submitted",
        ...
      }
    }
  ],
  "summary": {
    "task_states_count": 3,
    "submission_states_count": 2,
    "execution_statuses_count": 5,
    "total_events": 10
  }
}
```

---

## 4. CONTRACT VALIDATION APIS

### 4.1 Validate Contracts

**Endpoint:** `POST /setu/contract/validate`

**Purpose:** Validate contracts between Niyantran → Sampada → SETU

**Request (End-to-End Validation):**
```json
{
  "niyantran_event": {
    "trace_id": "trace_123",
    "entity_id": "candidate_001",
    "event_type": "task_submitted",
    "timestamp": "2024-12-20T10:00:00Z",
    "tenant_id": "tenant_abc"
  },
  "sampada_signal": {
    "trace_id": "trace_123",
    "entity_id": "candidate_001",
    "event_type": "task_submitted",
    "signal_type": "execution",
    "severity": "medium",
    "timestamp": "2024-12-20T10:00:01Z",
    "tenant_id": "tenant_abc"
  },
  "setu_ingestion": {
    "trace_id": "trace_123",
    "entity_id": "candidate_001",
    "event_type": "task_submitted",
    "timestamp": "2024-12-20T10:00:01Z",
    "tenant_id": "tenant_abc"
  }
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "validations": [
    {
      "stage": "niyantran_to_sampada",
      "result": {
        "valid": true,
        "violations": [],
        "validation_id": "niy_sam_20241220_100020"
      }
    },
    {
      "stage": "sampada_to_setu",
      "result": {
        "valid": true,
        "violations": [],
        "validation_id": "sam_set_20241220_100020"
      }
    }
  ],
  "validation_id": "e2e_20241220_100020"
}
```

**Error Response (400 - Contract Violation):**
```json
{
  "success": false,
  "error": "end_to_end_contract_violation",
  "message": "End-to-end contract validation failed",
  "details": {
    "valid": false,
    "validations": [
      {
        "stage": "niyantran_to_sampada",
        "result": {
          "valid": false,
          "error": {
            "valid": false,
            "violations": [
              {
                "field": "trace_id",
                "violation_type": "mismatch",
                "niyantran_value": "trace_123",
                "sampada_value": "trace_456"
              }
            ]
          }
        }
      }
    ]
  }
}
```

---

## 5. BUCKET VERIFICATION APIS

### 5.1 Verify Bucket History

**Endpoint:** `GET /setu/bucket/verify/{execution_id}/{trace_id}`

**Purpose:** Verify execution event, signal, and history exist in Bucket

**Request:**
```http
GET /setu/bucket/verify/exec_001/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "execution_id": "exec_001",
  "trace_id": "trace_20241220_100000_abc123",
  "verified": true,
  "verification_details": {
    "execution_event_exists": true,
    "signal_exists": true,
    "history_exists": true
  }
}
```

---

### 5.2 Get Bucket Lineage

**Endpoint:** `GET /setu/bucket/lineage/{trace_id}`

**Purpose:** Get lineage verification from Bucket without local duplication

**Request:**
```http
GET /setu/bucket/lineage/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "lineage_events": [...],
  "trace_logs": [...],
  "signal_records": [...],
  "verification_status": "retrieved_from_bucket",
  "local_duplication": false,
  "retrieved_at": "2024-12-20T10:30:00Z"
}
```

---

## 6. FAILURE HANDLING APIS

### 6.1 Test Failure Scenarios

**Endpoint:** `POST /setu/test/failures`

**Purpose:** Test failure handling scenarios (admin only)

**Request:**
```http
POST /setu/test/failures
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "test_timestamp": "2024-12-20T10:00:00Z",
  "scenarios": [
    {
      "test": "invalid_trace_id",
      "expected": "Reject request",
      "result": {
        "success": false,
        "error": "invalid_trace_id",
        "status_code": 400
      },
      "passed": true
    },
    {
      "test": "missing_required_field",
      "expected": "Contract validation failure",
      "result": {
        "success": false,
        "error": "contract_validation_failure",
        "status_code": 400
      },
      "passed": true
    },
    {
      "test": "unauthorized_tenant",
      "expected": "403 rejection",
      "result": {
        "success": false,
        "error": "unauthorized_tenant",
        "status_code": 403
      },
      "passed": true
    }
  ]
}
```

---

### 6.2 Get Failure Logs

**Endpoint:** `GET /setu/failures/{trace_id}`

**Purpose:** Get failure logs for a trace

**Request:**
```http
GET /setu/failures/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "failures": [
    {
      "event": "VALIDATION_FAILURE",
      "failure_type": "invalid_trace_id",
      "trace_id": "trace_20241220_100000_abc123",
      "tenant_id": "tenant_abc",
      "reason": "Invalid or malformed trace_id",
      "details": {...},
      "status_code": 400,
      "timestamp": "2024-12-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## 7. UI VISIBILITY APIS

### 7.1 Get Candidate State

**Endpoint:** `GET /setu/ui/candidate/{trace_id}`

**Purpose:** Get candidate state for UI (read-only)

**Request:**
```http
GET /setu/ui/candidate/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "candidate_id": "candidate_001",
  "current_state": "in_progress",
  "tenant_id": "tenant_abc",
  "last_updated": "2024-12-20T10:15:00Z",
  "total_events": 10
}
```

---

### 7.2 Get Task State Visibility

**Endpoint:** `GET /setu/ui/tasks/{trace_id}`

**Purpose:** Get task state for UI visibility (read-only)

**Request:**
```http
GET /setu/ui/tasks/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "tasks": [
    {
      "task_id": "task_001",
      "current_state": "completed",
      "last_updated": "2024-12-20T10:20:00Z",
      "total_state_changes": 3,
      "metadata": {...}
    }
  ],
  "total_tasks": 1
}
```

---

### 7.3 Get Signal Visibility

**Endpoint:** `GET /setu/ui/signals/{trace_id}`

**Purpose:** Get signals for UI visibility (read-only)

**Request:**
```http
GET /setu/ui/signals/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "signals_by_severity": {
    "low": [...],
    "medium": [...],
    "high": [...],
    "critical": [...]
  },
  "total_signals": 5,
  "severity_counts": {
    "low": 2,
    "medium": 2,
    "high": 1,
    "critical": 0
  }
}
```

---

### 7.4 Get Visibility Dashboard

**Endpoint:** `GET /setu/ui/dashboard/{trace_id}`

**Purpose:** Get complete visibility dashboard (NO execution buttons)

**Request:**
```http
GET /setu/ui/dashboard/trace_20241220_100000_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "trace_id": "trace_20241220_100000_abc123",
  "dashboard_type": "visibility_only",
  "no_execution_actions": true,
  "no_workflow_mutations": true,
  "candidate_state": {...},
  "task_state": {...},
  "signal_visibility": {...},
  "severity_dashboard": {...},
  "timeline": {...},
  "generated_at": "2024-12-20T10:30:00Z"
}
```

---

## 8. ERROR CODES

### Standard HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Successful operation |
| 400 | Bad Request | Invalid payload, missing fields, validation failure |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Tenant access violation, insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Trace continuity violation, lineage mismatch |
| 500 | Internal Error | Unexpected server error |

### SETU-Specific Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `invalid_payload_type` | 400 | Payload is not a dictionary |
| `missing_required_fields` | 400 | Missing required signal fields |
| `invalid_severity` | 400 | Invalid severity value |
| `invalid_signal_type` | 400 | Invalid signal type |
| `invalid_timestamp` | 400 | Invalid timestamp format |
| `invalid_trace_id` | 400 | Invalid or malformed trace_id |
| `validation_failed` | 400 | Pydantic validation failure |
| `contract_validation_failure` | 400 | Contract validation failed |
| `incomplete_contract` | 400 | Contract missing required fields |
| `unauthorized_tenant` | 403 | Tenant not authorized |
| `trace_id_regenerated` | 409 | Trace ID regeneration detected |
| `tenant_trace_collision` | 409 | Trace ID reused across tenants |
| `trace_root_mismatch` | 409 | Root trace ID mismatch |
| `trace_lineage_mutated` | 409 | Parent trace mismatch in lineage |
| `tenant_lineage_violation` | 409 | Tenant lineage mismatch |
| `lineage_hash_mismatch` | 409 | Lineage hash mismatch |
| `lineage_hash_mutated` | 409 | Stored lineage hash mismatch |

---

## 9. INTEGRATION CONTRACTS

### Contract 1: Sampada → SETU Signal Ingestion

**Required Fields:**
```javascript
{
  "trace_id": String (min 8 chars, immutable),
  "entity_id": String (non-empty),
  "event_type": String (non-empty),
  "signal_type": "execution" | "monitoring" | "alert" | "status",
  "severity": "low" | "medium" | "high" | "critical",
  "timestamp": ISO8601 string,
  "tenant_id": String (non-empty),
  "payload": Object (optional)
}
```

**Guarantees from SETU:**
- Validates all required fields
- Rejects invalid severity/signal_type
- Logs ingestion with ingestion_id
- Preserves trace_id immutability
- Enforces tenant isolation

---

### Contract 2: Niyantran → SETU Task State

**Required Fields:**
```javascript
{
  "task_id": String,
  "trace_id": String,
  "tenant_id": String,
  "state": String,
  "timestamp": ISO8601 string,
  "metadata": Object (optional)
}
```

**Guarantees from SETU:**
- Read-only consumption (no task assignment)
- Stores for visibility only
- Does NOT mutate Niyantran workflow
- Enforces tenant isolation

---

### Contract 3: SETU → Bucket Verification

**SETU Query:**
```javascript
GET /bucket/lineage/{trace_id}
```

**Expected from Bucket:**
- Lineage events for trace_id
- Signal records
- History logs
- No local duplication in SETU

**Guarantees from SETU:**
- Never duplicates Bucket truth
- Only verifies existence
- Queries Bucket as source of truth

---

## AUTHENTICATION FLOW

```
1. Client → POST /auth/login
2. Server ← JWT token
3. Client → GET /setu/ui/dashboard/{trace_id}
   Headers: Authorization: Bearer <token>
4. SETU validates token, checks tenant_id
5. Server ← Dashboard data (filtered by tenant)
```

---

## RATE LIMITING

**Current Status:** NOT IMPLEMENTED

**Recommended:**
- 100 requests/minute per tenant
- 1000 requests/minute per API key (admin)
- Burst allowance: 20 requests

---

## DEPENDENCIES

### External Systems

| System | Dependency Type | Critical? |
|--------|----------------|-----------|
| MongoDB | Database | ✅ Yes |
| Auth System | JWT validation | ✅ Yes |
| Sampada | Signal source | ⚠️ Moderate |
| Niyantran | State source | ⚠️ Moderate |

### Known Limitations

1. **Synchronous API:** No WebSocket support for real-time updates
2. **No Pagination:** Large result sets can be slow
3. **No Bulk Operations:** Must ingest signals one-by-one
4. **No Schema Versioning:** API changes require coordination

---

**END OF API & CONTRACTS HANDOVER**
