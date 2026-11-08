
from app.field_extraction import suggest_fields


def test_bangla_values_are_preserved_with_page_and_line_evidence():
    result = suggest_fields(
        [{"page": 2, "text": "মৌজা: উদাহরণ\nদাগ নং: ০০১২/৩\nজমির পরিমাণ: ১০ শতক"}], None
    )
    assert result["fields"]["plot_number"]["value"] == "০০১২/৩"
    assert result["fields"]["area"]["value"] == "১০ শতক"
    evidence = result["fields"]["plot_number"]["candidates"][0]
    assert evidence["page"] == 2 and evidence["line"] == 2
    assert evidence["source_text"] == "দাগ নং: ০০১২/৩"


def test_conflicts_are_not_guessed_and_missing_fields_remain_blank():
    result = suggest_fields([{"page": 1, "text": "Plot: 123\nPlot: 456\n123 unknown"}], None)
    assert result["fields"]["plot_number"]["status"] == "conflict"
    assert result["fields"]["plot_number"]["value"] == ""
    assert result["fields"]["owner_name"]["status"] == "missing"
    assert result["fields"]["area"]["value"] == ""


def test_reviewed_transcription_is_distinct_from_original_page_evidence():
    pages = [{"page": 1, "text": "Plot: 111"}]
    original = suggest_fields(pages, None)
    reviewed = suggest_fields(pages, "Plot: 222")
    assert original["version"] != reviewed["version"]
    assert reviewed["source"] == "reviewed_text"
    assert reviewed["fields"]["plot_number"]["value"] == "222"
    assert reviewed["fields"]["plot_number"]["candidates"][0]["page"] is None


def test_repeated_identical_labels_keep_all_evidence():
    result = suggest_fields([{"page": 1, "text": "Plot: 001\nPlot: 001"}], None)
    assert result["fields"]["plot_number"]["value"] == "001"
    assert result["fields"]["plot_number"]["status"] == "suggested"
    assert len(result["fields"]["plot_number"]["candidates"]) == 2


def test_unlabelled_narrative_is_not_extracted_as_a_fact():
    result = suggest_fields([{"page": 1, "text": "The owner claimed Plot 123 was theirs."}], None)
    assert all(field["status"] == "missing" for field in result["fields"].values())
