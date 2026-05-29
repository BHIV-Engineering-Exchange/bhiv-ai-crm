from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from auth_system import User, get_current_user
from .trace_continuity import TraceContinuityValidator, extract_execution
from .sovereign_routing_adapter import SovereignRoutingAdapter
from .bucket_lineage_adapter import BucketLineageAdapter
from .telemetry_layer import TelemetryLayer


def create_setu_router(
    validator: TraceContinuityValidator,
    routing_adapter: SovereignRoutingAdapter,
    lineage_adapter: BucketLineageAdapter,
    telemetry_layer: TelemetryLayer
) -> APIRouter:
    router = APIRouter(prefix="/setu", tags=["setu"])

    @router.post("/route")
    async def route_execution(
        request: Request,
        payload: Dict[str, Any],
        current_user: User = Depends(get_current_user)
    ):
        execution = getattr(request.state, "setu_execution", None) or extract_execution(payload)
        if not execution:
            raise HTTPException(status_code=400, detail="Execution contract is required")

        if not getattr(request.state, "setu_execution", None):
            await validator.validate(execution)

        routing_packet = routing_adapter.build_routing_packet(execution)
        if not routing_packet.get("ok"):
            telemetry_event = await telemetry_layer.emit_governance_rejection(
                execution,
                details={
                    "reason": routing_packet.get("reason"),
                    "details": routing_packet.get("details")
                }
            )
            lineage_event = await lineage_adapter.emit_execution_event(
                execution,
                "execution_blocked",
                {
                    "reason": routing_packet.get("reason"),
                    "details": routing_packet.get("details")
                }
            )

            status_code = 403
            if routing_packet.get("reason") == "execution_contract_invalid":
                status_code = 400

            return JSONResponse(
                status_code=status_code,
                content={
                    "ok": False,
                    "mode": "blocked",
                    "reason": routing_packet.get("reason"),
                    "details": routing_packet.get("details"),
                    "telemetry_event": telemetry_event,
                    "lineage_event": lineage_event
                }
            )

        telemetry_events = []
        lineage_events = []

        telemetry_events.append(await telemetry_layer.emit_execution_started(
            execution,
            details={"stage": "routing", "mode": "observe_only"}
        ))

        lineage_events.append(await lineage_adapter.emit_execution_event(
            execution,
            "execution_intent_received",
            {"stage": "intent_received"}
        ))

        lineage_events.append(await lineage_adapter.emit_execution_event(
            execution,
            "execution_routed",
            {"routing_target": (execution.get("target_system") or {}).get("system_id")}
        ))

        telemetry_events.append(await telemetry_layer.emit_execution_completed(
            execution,
            details={"result": "routed", "mode": "observe_only"}
        ))

        return {
            "ok": True,
            "mode": "observe_only",
            "routing": routing_packet,
            "lineage_events": lineage_events,
            "telemetry_events": telemetry_events
        }

    @router.get("/lineage/{trace_id}")
    async def get_lineage(trace_id: str, current_user: User = Depends(get_current_user)):
        events = await lineage_adapter.list_events(trace_id)
        return {"trace_id": trace_id, "events": events, "count": len(events)}

    @router.get("/telemetry/{trace_id}")
    async def get_telemetry(trace_id: str, current_user: User = Depends(get_current_user)):
        events = await telemetry_layer.list_events(trace_id)
        return {"trace_id": trace_id, "events": events, "count": len(events)}

    return router
