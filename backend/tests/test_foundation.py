import io
import json
import logging
from itertools import combinations
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.documents import DocumentType, document_readiness
from app.logging import SafeJsonFormatter
from app.main import create_app


@pytest.fixture
def client():
    with TestClient(create_app()) as value:
        yield value


def test_liveness_does_not_require_external_services(client):
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    UUID(response.headers["X-Request-ID"])


@pytest.mark.parametrize("count", [0, 1, 2, 3])
def test_all_document_combinations_require_all_three(count):
    for present in combinations(DocumentType, count):
        result = document_readiness(list(present))
        assert result["ready"] is (count == 3)
        assert set(result["missing"]) == {t.value for t in DocumentType if t not in present}


def test_duplicate_deeds_cannot_replace_other_documents(client):
    response = client.post(
        "/api/v1/document-requirements/check", json={"document_types": ["deed", "deed", "deed"]}
    )
    assert response.json() == {
        "ready": False,
        "missing": ["mutation", "khatian"],
        "required_count": 3,
    }


def test_all_three_document_types_are_ready(client):
    response = client.post(
        "/api/v1/document-requirements/check",
        json={"document_types": ["deed", "mutation", "khatian"]},
    )
    assert response.status_code == 200
    assert response.json()["ready"] is True


def test_invalid_request_does_not_echo_personal_data(client):
    response = client.post(
        "/api/v1/document-requirements/check",
        json={"document_types": ["PRIVATE-VALUE"], "name": "PRIVATE-NAME"},
    )
    assert response.status_code == 422
    assert "PRIVATE" not in response.text


def test_dependency_failure_is_honest_and_does_not_expose_secrets(client):
    async def available():
        pass

    async def unavailable():
        raise RuntimeError("postgres://private-password@host")

    client.app.state.probes = {"database": unavailable, "redis": available}
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["services"] == {"database": "unavailable", "redis": "ok"}
    assert "password" not in response.text


def test_healthy_dependencies(client):
    async def available():
        pass

    client.app.state.probes = {
        name: available for name in ("database", "redis", "storage", "vector_store")
    }
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_logging_discards_messages_exceptions_and_arbitrary_fields():
    output = io.StringIO()
    handler = logging.StreamHandler(output)
    handler.setFormatter(SafeJsonFormatter())
    logger = logging.Logger("privacy-test")
    logger.addHandler(handler)
    logger.error(
        "PRIVATE-MESSAGE",
        extra={"owner": "PRIVATE-OWNER", "nested": {"text": "PRIVATE-TEXT"}, "status_code": 422},
    )
    assert "PRIVATE" not in output.getvalue()
    assert json.loads(output.getvalue())["status_code"] == 422


def test_request_ids_are_generated_and_unique(client):
    first = client.get("/health/live", headers={"X-Request-ID": "PRIVATE-INPUT"})
    second = client.get("/health/live")
    assert first.headers["X-Request-ID"] != second.headers["X-Request-ID"]
    UUID(first.headers["X-Request-ID"])


def test_cors_disallows_unknown_origin(client):
    response = client.options(
        "/api/v1/document-requirements/check",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
