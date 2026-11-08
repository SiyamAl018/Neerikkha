"""Create the local AES-256 key once. Never print it or replace an existing key."""

import os
from pathlib import Path

path = Path("/keys/documents.key")
try:
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o444)
except FileExistsError:
    if len(path.read_bytes()) != 32:
        raise SystemExit("Existing encryption key has an invalid length") from None
else:
    with os.fdopen(fd, "wb") as stream:
        stream.write(os.urandom(32))
print("Document encryption key is ready")
