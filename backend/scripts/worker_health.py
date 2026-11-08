from datetime import UTC, datetime
from socket import gethostname

from redis import Redis
from rq import Worker

from app.config import Settings

connection = Redis.from_url(Settings().redis_url.get_secret_value(), socket_timeout=2)
workers = Worker.all(connection=connection)
healthy = any(
    worker.name == gethostname()
    and worker.last_heartbeat is not None
    and (datetime.now(UTC) - worker.last_heartbeat).total_seconds() < 120
    for worker in workers
)
raise SystemExit(0 if healthy else 1)
