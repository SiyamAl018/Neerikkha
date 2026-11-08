"""Synthetic integration check against the running Compose API and object store."""

import io
from time import monotonic, sleep
from uuid import uuid4

import httpx
import psycopg
from PIL import Image, ImageDraw, ImageFont

from app.config import Settings
from app.storage import DocumentStorage

settings = Settings()
storage = DocumentStorage(settings)
ids, keys = [], []
buffer = io.BytesIO()
fixture = Image.new("RGB", (1200, 1200), "white")
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 50)
ImageDraw.Draw(fixture).text(
    (80, 100), "SYNTHETIC DOCUMENT\nPlot 123\nArea 45", font=font, fill="black", spacing=30
)
fixture.save(buffer, format="PNG")
data = buffer.getvalue()
pdf_buffer = io.BytesIO()
fixture.save(pdf_buffer, format="PDF", save_all=True, append_images=[fixture])
try:
    with httpx.Client(base_url="http://web", timeout=30) as client:
        tokens = []
        for _ in range(2):
            payload = dict(
                email=f"{uuid4()}@example.com",
                password="Synthetic-password-42",
                display_name="Synthetic",
            )
            response = client.post("/api/v1/auth/register", json=payload)
            assert response.status_code == 201, response.text
            ids.append(response.json()["id"])
            response = client.post("/api/v1/auth/login", json=payload)
            assert response.status_code == 200, response.text
            tokens.append({"Authorization": "Bearer " + response.json()["access_token"]})
        response = client.post(
            "/api/v1/cases",
            headers=tokens[0],
            json=dict(reference="Synthetic upload", mouza="Example", survey_type="RS"),
        )
        assert response.status_code == 201, response.text
        case_id = response.json()["id"]
        path = "/api/v1/cases/" + case_id
        assert client.post(path + "/ocr", headers=tokens[0]).status_code == 409
        assert (
            client.post(
                path + "/documents/deed", content=b"fake image", headers=tokens[0]
            ).status_code
            == 422
        )
        assert (
            client.post(
                path + "/documents/deed", content=b"x" * (10 * 1024 * 1024 + 1), headers=tokens[0]
            ).status_code
            == 413
        )
        for kind in ("deed", "mutation"):
            response = client.post(path + "/documents/" + kind, content=data, headers=tokens[0])
            assert response.status_code == 201, response.text
            assert not response.json()["ready"]
        assert client.post(path + "/confirm-documents", headers=tokens[0]).status_code == 409
        response = client.post(
            path + "/documents/khatian", content=pdf_buffer.getvalue(), headers=tokens[0]
        )
        assert response.status_code == 201, response.text
        assert response.json()["ready"]
        doc = next(d for d in response.json()["documents"] if d["document_type"] == "deed")
        download = path + "/documents/" + doc["id"] + "/download"
        for method, route in [
            ("GET", path + "/readiness"),
            ("GET", download),
            ("POST", path + "/confirm-documents"),
            ("POST", path + "/documents/deed"),
            ("DELETE", path),
            ("GET", path + "/ocr"),
            ("POST", path + "/ocr"),
        ]:
            assert client.request(method, route, headers=tokens[1]).status_code == 404
        assert client.get(download).status_code == 401
        assert client.get(download, headers=tokens[0]).content == data
        assert (
            client.post(path + "/confirm-documents", headers=tokens[0]).json()["status"]
            == "documents_ready"
        )
        assert client.post(path + "/ocr", headers=tokens[0]).status_code == 202
        deadline = monotonic() + 120
        while monotonic() < deadline:
            result = client.get(path + "/ocr", headers=tokens[0]).json()
            if result["status"] == "needs_verification":
                break
            assert result["status"] in ("queued", "processing"), result["status"]
            sleep(0.5)
        else:
            raise AssertionError("OCR worker did not finish")
        assert len(result["documents"]) == 3
        for document in result["documents"]:
            assert len(document["pages"]) == (2 if document["document_type"] == "khatian" else 1)
            assert "123" in document["pages"][0]["text"]
            review_path = path + "/ocr/" + document["id"] + "/review"
            assert (
                client.post(review_path, json={"text": "Plot 123"}, headers=tokens[1]).status_code
                == 404
            )
            assert (
                client.post(review_path, json={"text": "Plot 123"}, headers=tokens[0]).status_code
                == 200
            )
        result = client.get(path + "/ocr", headers=tokens[0]).json()
        assert all(d["reviewed_text"] == "Plot 123" for d in result["documents"])
        assert result["comparison"]["reviewed_count"] == 0
        for document in result["documents"]:
            comparison_values = dict.fromkeys(document["extraction"]["fields"], "")
            comparison_values.update(
                mouza="Example",
                jl_number="১২",
                survey_type="RS",
                plot_number="০০১২৩",
                area="10 শতক",
            )
            if document["document_type"] == "mutation":
                comparison_values["plot_number"] = "999"
            response = client.post(
                path + "/ocr/" + document["id"] + "/fields",
                headers=tokens[0],
                json={
                    "source_version": document["extraction"]["version"],
                    "values": comparison_values,
                },
            )
            assert response.status_code == 200, response.text
        comparison = client.get(path + "/ocr", headers=tokens[0]).json()["comparison"]
        assert comparison["reviewed_count"] == 3
        comparison_states = {r["field"]: r["status"] for r in comparison["rows"]}
        assert comparison_states["plot_number"] == "different"
        assert comparison_states["area"] == "match"
        assert comparison["risk_assessment_available"] is False
        target = result["documents"][0]
        field_path = path + "/ocr/" + target["id"] + "/fields"
        text_path = path + "/ocr/" + target["id"] + "/review"
        previous_version = target["extraction"]["version"]
        checked_text = "মৌজা: উদাহরণ\nদাগ নং: ০০১২৩\nজমির পরিমাণ: ১০ শতক"
        assert (
            client.post(text_path, json={"text": checked_text}, headers=tokens[0]).status_code
            == 200
        )
        current = client.get(path + "/ocr", headers=tokens[0]).json()["documents"][0]
        assert current["extraction"]["fields"]["plot_number"]["value"] == "০০১২৩"
        values = {k: f["value"] for k, f in current["extraction"]["fields"].items()}
        payload = {"source_version": previous_version, "values": values}
        assert client.post(field_path, json=payload, headers=tokens[0]).status_code == 409
        payload["source_version"] = current["extraction"]["version"]
        assert client.post(field_path, json=payload, headers=tokens[1]).status_code == 404
        assert client.post(field_path, json=payload, headers=tokens[0]).status_code == 200
        assert client.post(field_path, json=payload, headers=tokens[0]).status_code == 409
        current = client.get(path + "/ocr", headers=tokens[0]).json()["documents"][0]
        assert current["field_review"]["values"]["plot_number"] == "০০১২৩"
        with psycopg.connect(settings.database_url.get_secret_value()) as connection:
            encrypted_fields = bytes(
                connection.execute(
                    "SELECT field_review FROM document_ocr WHERE document_id=%s", (target["id"],)
                ).fetchone()[0]
            )
            assert encrypted_fields.startswith(b"NRK1")
            assert b"plot_number" not in encrypted_fields
        assert (
            client.post(text_path, json={"text": "Plot: 456"}, headers=tokens[0]).status_code == 200
        )
        current = client.get(path + "/ocr", headers=tokens[0]).json()["documents"][0]
        assert current["field_review"] is None
        assert (
            client.get(path + "/ocr", headers=tokens[0]).json()["comparison"]["reviewed_count"] == 2
        )
        assert current["extraction"]["fields"]["plot_number"]["value"] == "456"
        with psycopg.connect(settings.database_url.get_secret_value()) as connection:
            rows = connection.execute(
                "SELECT result,reviewed_text FROM document_ocr o "
                "JOIN documents d ON d.id=o.document_id WHERE d.case_id=%s",
                (case_id,),
            ).fetchall()
            assert all(
                bytes(row[0]).startswith(b"NRK1") and b"Plot 123" not in bytes(row[1])
                for row in rows
            )
        response = client.post(path + "/documents/deed", content=data, headers=tokens[0])
        assert response.json()["status"] == "draft"
        assert client.get(path + "/ocr", headers=tokens[0]).json()["documents"] == []
        assert len(response.json()["documents"]) == 3
        assert client.get(download, headers=tokens[0]).status_code == 404
        with psycopg.connect(settings.database_url.get_secret_value()) as connection:
            keys = [
                r[0]
                for r in connection.execute(
                    "SELECT object_key FROM documents WHERE case_id=%s", (case_id,)
                )
            ]
        assert len(keys) == 4
        for key in keys:
            result = storage.client.get_object(Bucket=storage.bucket, Key=key)
            encrypted = result["Body"].read()
            result["Body"].close()
            assert encrypted.startswith(b"NRK1") and encrypted != data
            assert (
                httpx.get(settings.storage_url + "/" + storage.bucket + "/" + key).status_code
                == 403
            )
        assert client.delete(path, headers=tokens[0]).status_code == 204
        assert client.get(path, headers=tokens[0]).status_code == 404
        for key in keys:
            assert not storage.client.list_objects_v2(Bucket=storage.bucket, Prefix=key).get(
                "Contents"
            )
        print(
            "PASS: three required documents, invalid/oversized rejection, ownership, "
            "encrypted private storage, actual Tesseract OCR, text review, "
            "field extraction/review, stale-write rejection, encrypted fields, "
            "replacement invalidation, download and full deletion"
        )
finally:
    for key in keys:
        storage.delete(key)
    with psycopg.connect(settings.database_url.get_secret_value()) as connection:
        for user_id in ids:
            for row in connection.execute(
                "SELECT object_key FROM documents JOIN cases ON cases.id=documents.case_id "
                "WHERE owner_id=%s",
                (user_id,),
            ):
                storage.delete(row[0])
            connection.execute("DELETE FROM cases WHERE owner_id=%s", (user_id,))
            connection.execute("DELETE FROM audit_logs WHERE actor_id=%s", (user_id,))
            connection.execute("DELETE FROM users WHERE id=%s", (user_id,))
    storage.close()
