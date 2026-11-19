import asyncio
from collections.abc import Awaitable, Callable

import httpx
from redis.asyncio import Redis

from app.config import Settings

Probe = Callable[[], Awaitable[None]]


def create_probes(settings: Settings) -> dict[str, Probe]:
    async def database():
        # Isolate the native driver so liveness and non-database routes still start
        # when the host cannot load libpq. Readiness reports this as unavailable.
        import psycopg

        async with await psycopg.AsyncConnection.connect(
            settings.database_url.get_secret_value(), connect_timeout=2
        ) as connection:
            await connection.execute("SELECT 1")

    async def redis():
        async with Redis.from_url(
            settings.redis_url.get_secret_value(), socket_connect_timeout=2, socket_timeout=2
        ) as client:
            await client.ping()

    async def http_probe(url: str):
        async with httpx.AsyncClient(timeout=2, trust_env=False) as client:
            response = await client.get(url)
            response.raise_for_status()

    async def storage():
        await http_probe(settings.storage_url + "/readyz")

    async def vector():
        await http_probe(settings.vector_url + "/api/v2/heartbeat")

    return {"database": database, "redis": redis, "storage": storage, "vector_store": vector}


async def check_dependencies(probes: dict[str, Probe]) -> dict:
    async def check(name, probe):
        try:
            await asyncio.wait_for(probe(), timeout=3)
            return name, "ok"
        except Exception:
            # Never return exception text: connection errors can include credentials.
            return name, "unavailable"

    services = dict(await asyncio.gather(*(check(name, probe) for name, probe in probes.items())))
    return {
        "status": "ok" if all(v == "ok" for v in services.values()) else "degraded",
        "services": services,
    }
