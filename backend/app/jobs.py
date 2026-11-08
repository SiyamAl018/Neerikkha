def smoke_job() -> dict[str, str]:
    """Infrastructure-only task: proves that the worker can consume a queued job."""
    return {"status": "ok"}
