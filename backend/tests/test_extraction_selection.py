import json

import pytest

from app.field_extraction import field_identity, suggest_fields
from app.gemini_reader import ReaderError, parse_document


def entry(value, **kwargs):
    return {
        "field": "seller_name",
        "value": value,
        "source_text": f"বিক্রেতা: {value}",
        "uncertain": False,
        "scope": "primary",
        "multiple": False,
        **kwargs,
    }


def select(*entries):
    pages = parse_document(json.dumps({"pages": [{"page": 1, "fields": entries}]}), 1)
    return suggest_fields(pages, None)["fields"][entries[0]["field"]]


def test_explicit_joint_sellers_are_retained_but_alternative_readings_conflict():
    assert (
        select(entry("করিম", multiple=True), entry("রহিম", multiple=True))["value"] == "করিম; রহিম"
    )
    assert select(entry("করিম"), entry("রহিম"))["status"] == "conflict"
    assert select(entry("করিম", multiple=True), entry("রহিম"))["status"] == "conflict"


def test_historical_and_component_values_remain_auditable_but_do_not_replace_current():
    result = select(entry("করিম"), entry("রহিম", scope="historical"))
    assert result["value"] == "করিম" and len(result["candidates"]) == 2
    assert select(entry("রহিম", scope="historical"))["value"] == ""
    result = select(entry("৮ শতক", field="area"), entry("২ শতক", field="area", scope="component"))
    assert result["value"] == "৮ শতক"


def test_equivalent_areas_merge_without_converting_units_or_adding_shares():
    variants = ["= ০৮ (আট) শতক", "৮ (আট শতক)", "৮ শতক", "8.00 শতক"]
    assert {field_identity("area", v) for v in variants} == {"8 শতক"}
    assert select(*(entry(v, field="area") for v in variants))["status"] == "suggested"
    assert (
        select(entry("৮ শতক", field="area"), entry("৮ একর", field="area"))["status"] == "conflict"
    )
    assert field_identity("area", "৮ (২ শতক) শতক") != "8 শতক"
    assert field_identity("plot_number", "০০৮") != field_identity("plot_number", "৮")


def test_survey_punctuation_is_formatting_only():
    assert {field_identity("survey_type", v) for v in ["বি.এস", "বি,এস", "বি এস", "BS"]} == {"bs"}
    assert field_identity("survey_type", "এস.এ") == "sa"


def test_uncertain_multi_member_is_not_published():
    assert select(entry("করিম", uncertain=True, multiple=True))["value"] == ""
    assert (
        select(entry("করিম", multiple=True), entry("রহিম", uncertain=True, multiple=True))["value"]
        == ""
    )


def test_identifier_substring_is_not_evidence():
    assert select(entry("১২", field="plot_number", source_text="দাগ: ৩১২"))["value"] == ""


@pytest.mark.parametrize("change", [{"scope": "invented"}, {"multiple": "yes"}])
def test_invalid_selection_metadata_is_rejected(change):
    with pytest.raises(ReaderError):
        select(entry("করিম", **change))
