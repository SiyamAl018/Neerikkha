from time import monotonic, sleep

from redis import Redis
from rq import Queue

from app.config import Settings
from app.jobs import smoke_job

connection = Redis.from_url(Settings().redis_url.get_secret_value())
job = Queue("neerikkha", connection=connection).enqueue(smoke_job, result_ttl=60)
deadline = monotonic() + 30
while monotonic() < deadline:
    job.refresh()
    if job.is_finished:
        assert job.return_value() == {"status": "ok"}
        print("PASS: worker consumed the smoke job")
        break
    if job.is_failed:
        raise SystemExit("FAIL: worker job failed")
    sleep(0.5)
else:
    raise SystemExit("FAIL: worker did not finish within 30 seconds")
