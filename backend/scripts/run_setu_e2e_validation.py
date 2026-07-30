#!/usr/bin/env python3
"""
Live SETU end-to-end runtime validation runner.

Workflow A: signal ingest -> niyantran task state -> UI dashboard
Workflow B: execution route -> telemetry/lineage continuity (+ optional Sampada gateway)

Usage:
  cd backend
  python scripts/run_setu_e2e_validation.py
  python scripts/run_setu_e2e_validation.py --mock-gateway
  python scripts/run_setu_e2e_validation.py --base-url http://localhost:8000 --username admin --password admin123
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

from setu.utils import compute_lineage_hash

END_TO_END_TRACE = json.loads((ROOT / "end_to_end_trace.json").read_text(encoding="utf-8"))


class GatewayStubState:
    requests: List[Dict[str, Any]] = []


class GatewayStubHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length else ""
        GatewayStubState.requests.append(
            {
                "path": self.path,
                "authorization": self.headers.get("Authorization"),
                "body": json.loads(body) if body else None,
            }
        )
        response = json.dumps({"accepted": True, "signal_type": "crm_participation"}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


def start_mock_gateway(host: str = "127.0.0.1", port: int = 8001) -> HTTPServer:
    GatewayStubState.requests.clear()
    server = HTTPServer((host, port), GatewayStubHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.2)
    return server


def detect_backend_type(base_url: str) -> str:
    """Return python_setu, nodejs_crm, or unknown based on root payload."""
    try:
        response = httpx.get(f"{base_url.rstrip('/')}/", timeout=30.0)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return "unknown"

    message = str(payload.get("message", ""))
    if "AI Agent Logistics + CRM + Infiverse API" in message:
        return "python_setu"
    if payload.get("success") and "AI CRM Logistics API" in message:
        return "nodejs_crm"
    return "unknown"


def login(base_url: str, username: str, password: str) -> str:
    response = httpx.post(
        f"{base_url}/auth/login",
        json={"username": username, "password": password},
        timeout=30.0,
    )
    response.raise_for_status()
    token = response.json()["access_token"]
    return token


def workflow_a(client: httpx.Client, trace_id: str) -> Dict[str, Any]:
    ingest = client.post(
        "/setu/signals/ingest",
        json={
            "trace_id": trace_id,
            "entity_id": "candidate_001",
            "event_type": "task_submitted",
            "signal_type": "execution",
            "severity": "medium",
            "timestamp": "2024-12-19T10:30:00Z",
            "tenant_id": "tenant_proof",
            "payload": {"task_id": "task_001", "result": "success"},
        },
    )
    task_state = client.post(
        "/setu/niyantran/task-state",
        json={
            "task_id": "task_001",
            "trace_id": trace_id,
            "tenant_id": "tenant_proof",
            "state": "in_progress",
            "timestamp": "2024-12-19T10:35:00Z",
        },
    )
    dashboard = client.get(f"/setu/ui/dashboard/{trace_id}")
    failures = client.post("/setu/test/failures")

    return {
        "ingest_status": ingest.status_code,
        "ingest_body": ingest.json(),
        "task_state_status": task_state.status_code,
        "task_state_body": task_state.json(),
        "dashboard_status": dashboard.status_code,
        "dashboard_body": dashboard.json(),
        "failures_status": failures.status_code,
        "failures_body": failures.json(),
    }


def workflow_b(client: httpx.Client, execution_contract: Dict[str, Any]) -> Dict[str, Any]:
    route = client.post("/setu/route", json=execution_contract)
    trace_id = execution_contract["trace_id"]
    telemetry = client.get(f"/setu/telemetry/{trace_id}")
    lineage = client.get(f"/setu/lineage/{trace_id}")

    return {
        "route_status": route.status_code,
        "route_body": route.json(),
        "route_headers": dict(route.headers),
        "telemetry_status": telemetry.status_code,
        "telemetry_body": telemetry.json(),
        "lineage_status": lineage.status_code,
        "lineage_body": lineage.json(),
    }


def build_runtime_execution_contract(trace_suffix: str) -> Dict[str, Any]:
    contract = {
        "execution_id": f"exec_runtime_{trace_suffix}",
        "trace_id": f"trace_runtime_{trace_suffix}",
        "source_system": "tantra",
        "actor": {"actor_id": "user_4721", "actor_type": "user"},
        "intent_type": "approve_order",
        "target_system": {"system_id": "sarathi", "system_type": "routing"},
        "parameters": {"order_id": "ORD_44821", "approval_level": "ops"},
        "priority": 3,
        "timestamp": "2026-05-29T12:00:02Z",
        "schema_version": "1.0",
        "tenant_id": "tenant_runtime_proof",
        "governance": {
            "gated_bridge": {
                "status": "approved",
                "attestation_id": "att_8811",
                "checked_at": "2026-05-29T12:00:06Z",
                "policy_id": "gov_exec_v1",
                "policy_version": "1.0",
            }
        },
    }
    contract["trace_lineage"] = {
        "root_trace_id": contract["trace_id"],
        "lineage_hash": compute_lineage_hash(contract),
    }
    return contract


def assert_workflow_a(results: Dict[str, Any]) -> None:
    assert results["ingest_status"] == 200, results
    assert results["ingest_body"].get("success") is True, results
    assert results["task_state_status"] == 200, results
    assert results["task_state_body"].get("success") is True, results
    assert results["dashboard_status"] == 200, results
    assert results["dashboard_body"].get("trace_id") == "trace_runtime_a001", results


def assert_workflow_b(results: Dict[str, Any], trace_id: str) -> None:
    assert results["route_status"] == 200, results
    route_body = results["route_body"]
    assert route_body.get("ok") is True, results
    assert route_body.get("mode") == "observe_only", results
    assert results["route_headers"].get("x-setu-trace-id") == trace_id, results
    assert results["telemetry_status"] == 200, results
    assert results["lineage_status"] == 200, results
    assert results["telemetry_body"].get("count", 0) >= 1, results
    assert results["lineage_body"].get("count", 0) >= 1, results


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Run SETU E2E runtime validation")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="admin123")
    parser.add_argument("--mock-gateway", action="store_true", help="Start local gateway stub on :8001")
    parser.add_argument("--gateway-port", type=int, default=8001)
    args = parser.parse_args(argv)

    gateway_server = None
    if args.mock_gateway:
        gateway_server = start_mock_gateway(port=args.gateway_port)
        print(f"[OK] Mock Sampada gateway listening on http://127.0.0.1:{args.gateway_port}")

    try:
        backend_type = detect_backend_type(args.base_url)
        print(f"[INFO] Backend type at {args.base_url}: {backend_type}")
        if backend_type == "nodejs_crm":
            print(
                "[FAIL] This URL is the Node.js CRM API (backend-nodejs). "
                "SETU lives on the Python FastAPI backend (backend/api_app.py). "
                "Deploy Python with: uvicorn api_app:app --host 0.0.0.0 --port $PORT"
            )
            return 1
        if backend_type != "python_setu":
            print("[WARN] Could not confirm Python SETU backend from root response; continuing anyway.")

        token = login(args.base_url, args.username, args.password)
        headers = {"Authorization": f"Bearer {token}"}
        client = httpx.Client(base_url=args.base_url, headers=headers, timeout=30.0)

        print("[RUN] Workflow A — visibility path")
        workflow_a_results = workflow_a(client, "trace_runtime_a001")
        assert_workflow_a(workflow_a_results)
        print("[PASS] Workflow A")

        print("[RUN] Workflow B — route + trace continuity")
        execution_contract = build_runtime_execution_contract("b001")
        workflow_b_results = workflow_b(client, execution_contract)
        assert_workflow_b(workflow_b_results, execution_contract["trace_id"])
        print("[PASS] Workflow B")

        if args.mock_gateway:
            assert GatewayStubState.requests, "Expected outbound dispatch to mock gateway"
            last = GatewayStubState.requests[-1]
            assert last["path"].endswith("/v1/setu/signals/crm_participation"), last
            print(f"[PASS] Outbound gateway received {len(GatewayStubState.requests)} request(s)")
            print(json.dumps(last, indent=2))
        else:
            print("[INFO] Gateway round-trip not verified — rerun with --mock-gateway or check live gateway logs")

        print("\nSETU E2E validation completed successfully.")
        return 0
    except httpx.HTTPError as exc:
        print(f"[FAIL] HTTP error: {exc}")
        print("Ensure MongoDB is running and CRM is started with: uvicorn api_app:app --port 8000")
        return 1
    except AssertionError as exc:
        print(f"[FAIL] Assertion failed: {exc}")
        return 1
    finally:
        if gateway_server:
            gateway_server.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
