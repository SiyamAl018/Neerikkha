import json

import httpx
import pytest

from app.config import Settings
from app.field_extraction import suggest_fields
from app.gemini_reader import ReaderError, parse_document, read_document


def response_data(uncertain=False, value="০০১২", evidence="দাগ নং: ০০১২"):
    return {
        "pages": [
            {
                "page": 1,
                "fields": [
                    {
                        "field": "plot_number",
                        "value": value,
                        "source_text": evidence,
                        "uncertain": uncertain,
                    }
                ],
            }
        ]
    }


def test_gemini_fields_do_not_require_tesseract_or_manual_input():
    pages = parse_document(json.dumps(response_data()), 1)
    field = suggest_fields(pages, None)["fields"]["plot_number"]
    assert field["value"] == "০০১২"
    assert field["candidates"][0]["engine"] == "gemini"
    assert pages[0]["text_kind"] == "field_excerpts"


@pytest.mark.parametrize("document", [response_data(True), response_data(value="123")])
def test_uncertain_or_unsupported_values_are_not_presented_as_readable(document):
    field = suggest_fields(parse_document(json.dumps(document), 1), None)["fields"]["plot_number"]
    assert field["value"] == "" and field["status"] == "uncertain"


@pytest.mark.parametrize(
    "document",
    [
        {"pages": []},
        {"pages": [{"page": True, "fields": []}]},
        {"pages": [{"page": 2, "fields": []}]},
        {"pages": [{"page": 1, "fields": [{}]}]},
    ],
)
def test_missing_pages_and_invalid_fields_fail_explicitly(document):
    with pytest.raises(ReaderError, match="gemini_invalid_output"):
        parse_document(json.dumps(document), 1)


def test_missing_key_does_not_attempt_network(tmp_path, monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail("Network must not be attempted without a key")

    monkeypatch.setattr(httpx.Client, "post", forbidden)
    with pytest.raises(ReaderError, match="gemini_not_configured"):
        read_document(
            b"data",
            "application/pdf",
            1,
            "deed",
            Settings(gemini_key_file=str(tmp_path / "missing")),
        )


def test_request_uses_header_key_and_entire_pdf_once(tmp_path, monkeypatch):
    key = tmp_path / "key"
    key.write_text("test-key-not-real")
    calls = []

    def fake_post(self, url, **kwargs):
        calls.append((url, kwargs))
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {"parts": [{"text": json.dumps(response_data())}]},
                    }
                ]
            },
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    result = read_document(
        b"test pdf",
        "application/pdf",
        1,
        "deed",
        Settings(gemini_key_file=str(key), gemini_passes=1),
    )
    assert len(calls) == 1 and "test-key" not in calls[0][0]
    assert calls[0][1]["headers"]["x-goog-api-key"] == "test-key-not-real"
    assert (
        calls[0][1]["json"]["contents"][0]["parts"][1]["inlineData"]["mimeType"]
        == "application/pdf"
    )
    assert result["engine"] == "gemini-document-v1"


def test_provider_error_does_not_expose_response_or_key(tmp_path, monkeypatch):
    key = tmp_path / "key"
    key.write_text("test-key-not-real")
    monkeypatch.setattr(
        httpx.Client,
        "post",
        lambda *args, **kwargs: httpx.Response(403, text="PRIVATE KEY AND DOCUMENT"),
    )
    with pytest.raises(ReaderError, match="^gemini_key_rejected$"):
        read_document(b"test", "image/png", 1, "khatian", Settings(gemini_key_file=str(key)))
