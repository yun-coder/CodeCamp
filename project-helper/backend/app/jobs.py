from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Job:
    id: str
    project_id: int | None = None
    status: str = "queued"
    events: list[dict[str, Any]] = field(default_factory=list)
    queue: asyncio.Queue[dict[str, Any]] = field(default_factory=asyncio.Queue)

    async def publish(self, event: str, message: str, **data: Any) -> None:
        payload = {"event": event, "message": message, **data}
        self.events.append(payload)
        await self.queue.put(payload)


JOBS: dict[str, Job] = {}


def create_job() -> Job:
    job = Job(id=uuid.uuid4().hex)
    JOBS[job.id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return JOBS.get(job_id)


def sse(data: dict[str, Any], event: str = "message") -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
