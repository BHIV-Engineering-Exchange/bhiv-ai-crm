"""In-memory MongoSetuStore substitute for SETU unit/integration tests."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class InMemorySetuStore:
    def __init__(self):
        self.trace_records: Dict[str, Dict[str, Any]] = {}
        self.trace_by_trace: Dict[str, Dict[str, Any]] = {}
        self.trace_logs: List[Dict[str, Any]] = []
        self.telemetry: List[Dict[str, Any]] = []
        self.lineage: List[Dict[str, Any]] = []
        self.signals: List[Dict[str, Any]] = []
        self.visibility: List[Dict[str, Any]] = []
        self.failures: List[Dict[str, Any]] = []

    async def get_trace_record(self, execution_id: str) -> Optional[Dict[str, Any]]:
        return self.trace_records.get(execution_id)

    async def get_trace_by_trace_id(self, trace_id: str) -> Optional[Dict[str, Any]]:
        return self.trace_by_trace.get(trace_id)

    async def upsert_trace_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        self.trace_records[record["execution_id"]] = record
        self.trace_by_trace[record["trace_id"]] = record
        return record

    async def append_trace_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        self.trace_logs.append(log)
        return log

    async def append_telemetry(self, event: Dict[str, Any]) -> Dict[str, Any]:
        self.telemetry.append(event)
        return event

    async def append_lineage_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        self.lineage.append(event)
        return event

    async def next_lineage_sequence(self, trace_id: str) -> int:
        return sum(1 for event in self.lineage if event.get("trace_id") == trace_id) + 1

    async def list_lineage_events(self, trace_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        events = [event for event in self.lineage if event.get("trace_id") == trace_id]
        return events[:limit]

    async def list_telemetry_events(self, trace_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        events = [event for event in self.telemetry if event.get("trace_id") == trace_id]
        return events[:limit]

    async def list_trace_logs(self, trace_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        events = [event for event in self.trace_logs if event.get("trace_id") == trace_id]
        return events[:limit]

    async def append_signal_ingestion(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        self.signals.append(signal)
        return signal

    async def list_signal_ingestion(self, trace_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        events = [event for event in self.signals if event.get("trace_id") == trace_id]
        return events[:limit]

    async def append_visibility_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        self.visibility.append(record)
        return record

    async def list_visibility_records(
        self,
        trace_id: str,
        record_type: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"trace_id": trace_id}
        if record_type:
            query["record_type"] = record_type
        if filters:
            query.update(filters)
        events = [
            event
            for event in self.visibility
            if all(event.get(key) == value for key, value in query.items())
        ]
        return events[:limit]

    async def append_failure_log(self, record: Dict[str, Any]) -> Dict[str, Any]:
        self.failures.append(record)
        return record

    async def list_failure_logs(self, trace_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        events = [event for event in self.failures if event.get("trace_id") == trace_id]
        return events[:limit]
