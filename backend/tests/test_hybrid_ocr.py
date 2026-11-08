from app.field_extraction import suggest_fields


def page(printed="", handwritten="", **vision):
    return {
        "page": 1,
        "text": printed,
        "readings": [
            {"page": 1, "text": printed, "engine": "tesseract"},
            {"page": 1, "text": handwritten, "engine": "orus"},
        ],
        "vision_fields": vision,
    }


def test_vision_supplies_unlabelled_handwritten_field_without_manual_input():
    result = suggest_fields([page(handwritten="উদাহরণ", mouza="উদাহরণ")], None)
    field = result["fields"]["mouza"]
    assert field["value"] == "উদাহরণ"
    assert field["candidates"][0]["engine"] == "qwen3-vl"
    assert field["candidates"][0]["page"] == 1
    assert field["needs_review"]


def test_engine_disagreement_is_visible_instead_of_majority_guess():
    result = suggest_fields([page("Plot: 123", "Plot: 128", plot_number="128")], None)
    field = result["fields"]["plot_number"]
    assert field["status"] == "conflict" and field["value"] == ""
    assert len(field["candidates"]) == 3


def test_unsupported_vision_guess_is_not_published():
    field = suggest_fields([page(plot_number="123")], None)["fields"]["plot_number"]
    assert field["value"] == "" and field["status"] == "uncertain"
    assert field["candidates"][0]["grounded"] is False


def test_equivalent_scripts_agree_but_leading_zero_is_preserved():
    field = suggest_fields([page("Plot: 0012", plot_number="০০১২")], None)["fields"]["plot_number"]
    assert field["value"] == "0012" and field["status"] == "suggested"


def test_reviewed_text_takes_precedence_over_models():
    result = suggest_fields([page(plot_number="123")], "Plot: 456")
    assert result["fields"]["plot_number"]["value"] == "456"


def test_table_index_is_not_accepted_as_record_number_by_vision():
    field = suggest_fields([page(handwritten="2", khatian_number="2")], None)["fields"][
        "khatian_number"
    ]
    assert field["value"] == "" and field["status"] == "uncertain"


def test_table_area_does_not_capture_a_nearby_date():
    source = {
        "page": 1,
        "text": "",
        "lines": [
            {"text": "মোট জমি", "bbox": [100, 100, 180, 120]},
            {"text": "তারিখ: 11", "bbox": [100, 170, 180, 190]},
        ],
    }
    assert suggest_fields([source], None)["fields"]["area"]["value"] == ""
    source["lines"].append({"text": "৮ শতক", "bbox": [100, 123, 180, 143]})
    assert suggest_fields([source], None)["fields"]["area"]["value"] == "৮ শতক"
