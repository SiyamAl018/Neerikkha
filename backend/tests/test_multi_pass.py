import json

import httpx
import pytest

from app.config import Settings
from app.field_extraction import suggest_fields
from app.gemini_reader import ReaderError, parse_document, read_document


def field(value, key="plot_number", evidence=None, **overrides):
    return {
        "field": key,
        "value": value,
        "source_text": evidence if evidence is not None else f"দাগ নং: {value}",
        "uncertain": False,
        "scope": "primary",
        "multiple": False,
        **overrides,
    }


def document(*fields):
    return {"pages": [{"page": 1, "fields": list(fields)}]}


def reply(payload):
    return httpx.Response(
        200,
        json={
            "candidates": [
                {"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(payload)}]}}
            ]
        },
    )


def settings(tmp_path, passes=2):
    key = tmp_path / "key"
    key.write_text("test-key-not-real")
    return Settings(gemini_key_file=str(key), gemini_passes=passes)


def run(tmp_path, monkeypatch, *responses, passes=2):
    calls = []

    def fake_post(self, url, **kwargs):
        calls.append(kwargs["json"])
        return responses[min(len(calls) - 1, len(responses) - 1)]

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    result = read_document(b"test", "image/png", 1, "deed", settings(tmp_path, passes))
    return result, suggest_fields(result["pages"], None)["fields"], calls


def test_independent_passes_confirm_a_shared_value(tmp_path, monkeypatch):
    _, fields, calls = run(
        tmp_path, monkeypatch, reply(document(field("০০১২"))), reply(document(field("০০১২")))
    )
    assert len(calls) == 2
    plot = fields["plot_number"]
    assert plot["value"] == "০০১২"
    assert plot["agreement"] == "confirmed" and plot["passes"] == 2
    assert plot["confidence"] >= 0.9


def test_disagreeing_passes_never_publish_a_guessed_value(tmp_path, monkeypatch):
    _, fields, _ = run(
        tmp_path, monkeypatch, reply(document(field("০০১২"))), reply(document(field("০০১৩")))
    )
    plot = fields["plot_number"]
    assert plot["status"] == "conflict" and plot["value"] == ""
    assert plot["confidence"] == 0.0


def test_value_found_by_one_pass_only_is_kept_but_marked_partial(tmp_path, monkeypatch):
    _, fields, _ = run(tmp_path, monkeypatch, reply(document(field("০০১২"))), reply(document()))
    plot = fields["plot_number"]
    assert plot["value"] == "০০১২"
    assert plot["agreement"] == "partial" and plot["needs_review"] is True
    assert plot["confidence"] <= 0.6


def test_equivalent_digit_scripts_agree_across_passes(tmp_path, monkeypatch):
    _, fields, _ = run(
        tmp_path, monkeypatch, reply(document(field("০০১২"))), reply(document(field("0012")))
    )
    plot = fields["plot_number"]
    assert plot["value"] == "০০১২" and plot["agreement"] == "confirmed"


def test_label_noise_is_removed_and_the_change_is_recorded():
    pages = parse_document(
        json.dumps(document(field("দাগ নং: ০০১২", evidence="দাগ নং: ০০১২"))), 1
    )
    candidate = pages[0]["structured_fields"][0]
    assert candidate["value"] == "০০১২"
    assert candidate["repair"]["kinds"] == ["label_removed"]
    assert candidate["repair"]["from"] == "দাগ নং: ০০১২"
    assert candidate["confidence"] == 0.8
    assert suggest_fields(pages, None)["fields"]["plot_number"]["value"] == "০০১২"


def test_thousands_separator_is_a_format_match_not_a_character_rewrite():
    pages = parse_document(
        json.dumps(document(field("1200", evidence="দাগ নং: ১,২০০"))), 1
    )
    candidate = pages[0]["structured_fields"][0]
    assert candidate["value"] == "1200"
    assert candidate["evidence_match"] == "format"
    assert candidate["confidence"] == 0.75
    assert candidate["repair"] is None


def test_value_that_does_not_match_its_evidence_stays_unpublished():
    pages = parse_document(json.dumps(document(field("123", evidence="দাগ নং: ০০১২"))), 1)
    candidate = pages[0]["structured_fields"][0]
    assert candidate["grounded"] is False and candidate["confidence"] == 0.0
    assert suggest_fields(pages, None)["fields"]["plot_number"]["value"] == ""


def test_area_formatting_is_not_converted_into_a_new_amount():
    pages = parse_document(
        json.dumps(document(field("8 শতক", key="area", evidence="মোট জমি: ৮.০০ শতক"))), 1
    )
    candidate = pages[0]["structured_fields"][0]
    assert candidate["evidence_match"] == "format" and candidate["value"] == "8 শতক"


def test_failed_second_pass_keeps_the_first_reading_and_flags_it(tmp_path, monkeypatch):
    result, fields, calls = run(
        tmp_path, monkeypatch, reply(document(field("০০১২"))), httpx.Response(500)
    )
    assert len(calls) == 2
    assert result["warnings"] == ["independent_pass_failed"]
    assert result["pages"][0]["warnings"] == ["independent_pass_failed"]
    plot = fields["plot_number"]
    assert plot["value"] == "০০১২" and plot["agreement"] == "partial"


def test_first_pass_failure_is_reported_rather_than_retried_silently(tmp_path, monkeypatch):
    monkeypatch.setattr(httpx.Client, "post", lambda *args, **kwargs: httpx.Response(500))
    with pytest.raises(ReaderError, match="^gemini_unavailable$"):
        read_document(b"test", "image/png", 1, "deed", settings(tmp_path))


def test_single_pass_configuration_keeps_the_previous_behaviour(tmp_path, monkeypatch):
    result, fields, calls = run(
        tmp_path, monkeypatch, reply(document(field("০০১২"))), passes=1
    )
    assert len(calls) == 1
    assert result["pages"][0]["passes"] == 1
    plot = fields["plot_number"]
    assert plot["agreement"] == "single" and plot["confidence"] == 0.9
