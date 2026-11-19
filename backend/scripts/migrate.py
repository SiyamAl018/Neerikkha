"""Apply numbered, immutable SQL migrations on startup."""

from pathlib import Path

import psycopg

from app.config import Settings

with psycopg.connect(Settings().database_url.get_secret_value(), autocommit=True) as connection:
    connection.execute("SELECT pg_advisory_lock(610019)")
    connection.execute(
        "CREATE TABLE IF NOT EXISTS schema_versions "
        "(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
    )
    applied = {row[0] for row in connection.execute("SELECT version FROM schema_versions")}
    for path in sorted(Path("/app/migrations").glob("*.sql")):
        version = int(path.name.split("_")[0])
        if version not in applied:
            connection.execute(path.read_text(encoding="utf-8"))
            print(f"Applied migration {version}")
    connection.execute("SELECT pg_advisory_unlock(610019)")
