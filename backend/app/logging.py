import json
import logging


class SafeJsonFormatter(logging.Formatter):
    """Allowlist structured metadata. Arbitrary messages, extras and exceptions are discarded."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {"level": record.levelname, "event": "http_request"}
        for key in ("request_id", "method", "status_code", "duration_ms"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        return json.dumps(payload)


def configure_logging() -> logging.Logger:
    logger = logging.getLogger("neerikkha.requests")
    logger.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(SafeJsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger
