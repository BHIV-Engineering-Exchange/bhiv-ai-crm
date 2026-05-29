from datetime import datetime
from typing import Any, Dict, Optional

from .mongo_store import MongoSetuStore
from .utils import compute_determinism_hash


class BucketLineageAdapter:
    def __init__(self, store: MongoSetuStore):
        self.store = store

    async def emit_execution_event(self, execution: Dict[str, Any], event_type: str,
                                   payload: Optional[Dict[str, Any]] = None,
                                   overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not execution.get("execution_id") or not execution.get("trace_id") or not execution.get("tenant_id"):
            raise ValueError("Execution identifiers are required for lineage emission")

        overrides = overrides or {}
        timestamp = overrides.get("timestamp") or execution.get("timestamp") or datetime.utcnow().isoformat()
        sequence = overrides.get("sequence") or await self.store.next_lineage_sequence(execution.get("trace_id"))

        event = {
            "lineage_event_id": "",
            "execution_id": execution.get("execution_id"),
            "trace_id": execution.get("trace_id"),
            "tenant_id": execution.get("tenant_id"),
            "event_type": event_type,
            "timestamp": timestamp,
            "sequence": sequence,
            "payload": payload or {}
        }

        event["determinism_hash"] = compute_determinism_hash(event)
        event["lineage_event_id"] = "lin_" + event["determinism_hash"][:16]

        await self.store.append_lineage_event(event)
        return event

    async def list_events(self, trace_id: str, limit: int = 200):
        return await self.store.list_lineage_events(trace_id, limit)
