from socket import gethostname

from redis import Redis
from rq import Queue, Worker

from app.config import Settings


def main():
    """Linux container worker for local OCR and infrastructure checks."""
    connection = Redis.from_url(Settings().redis_url.get_secret_value())
    Worker(
        [Queue("neerikkha", connection=connection)], connection=connection, name=gethostname()
    ).work()


if __name__ == "__main__":
    main()
