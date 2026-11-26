from copy import deepcopy

from app.comparison import compare_documents, normalize
from app.field_extraction import LABELS


def documents():
    values = dict.fromkeys(LABELS, "")
    values.update(
        mouza="Example", jl_number="১২", survey_type="RS", plot_number="০০১", area="১০ শতক"
    )
    return [
        dict(
            document_type=kind,
            extraction={"version": "current"},
            field_review={"source_version": "current", "values": deepcopy(values)},
        )
        for kind in ("deed", "mutation", "khatian")
    ]


def set_values(docs, **values):
    for doc in docs:
        doc["field_review"]["values"].update(values)
    return docs


def rows(docs):
    return {row["field"]: row for row in compare_documents(docs)["rows"]}


def statuses(docs):
    return {field: row["status"] for field, row in rows(docs).items()}


def test_normalizes_digits_and_spaces_without_losing_identifier_zeroes():
    assert normalize("  ০০১/২  ") == "001/2"
    docs = documents()
    docs[1]["field_review"]["values"].update(plot_number="001", area="10.0 শতক")
    assert statuses(docs)["plot_number"] == "match"
    assert statuses(docs)["area"] == "match"
    docs[1]["field_review"]["values"]["plot_number"] = "1"
    assert statuses(docs)["plot_number"] == "different"


def test_missing_and_stale_reviews_never_produce_match():
    docs = documents()
    docs[1]["field_review"]["source_version"] = "old"
    assert statuses(docs)["mouza"] == "awaiting_review"
    assert compare_documents(docs)["reviewed_count"] == 2
    assert compare_documents([])["reviewed_count"] == 0


def test_missing_context_and_different_surveys_block_plot_comparison():
    docs = documents()
    docs[1]["field_review"]["values"]["jl_number"] = ""
    assert statuses(docs)["jl_number"] == "incomplete"
    assert statuses(docs)["plot_number"] == "context_required"
    docs = documents()
    docs[1]["field_review"]["values"]["survey_type"] = "CS"
    assert statuses(docs)["plot_number"] == "context_differs"
    assert statuses(docs)["area"] == "context_differs"


def test_area_never_converts_units_or_guesses_missing_units():
    docs = documents()
    docs[1]["field_review"]["values"]["area"] = "10 acres"
    assert statuses(docs)["area"] == "unit_review"
    docs[1]["field_review"]["values"]["area"] = "10"
    assert statuses(docs)["area"] == "unit_review"
    docs[1]["field_review"]["values"]["area"] = "11 শতক"
    assert statuses(docs)["area"] == "different"


def test_names_and_independent_record_numbers_are_reference_only():
    docs = set_values(documents(), owner_name="করিম")
    assert statuses(docs)["owner_name"] == "reference_only"
    docs = set_values(docs, khatian_number="০১২৩")
    assert statuses(docs)["khatian_number"] == "reference_only"
    assert compare_documents(docs)["risk_assessment_available"] is False


def test_absent_reference_values_are_missing_not_reference_only():
    docs = documents()
    assert statuses(docs)["khatian_number"] == "missing"
    assert statuses(docs)["owner_name"] == "missing"


def test_automatic_fields_are_compared_without_claiming_human_review():
    docs = documents()
    for doc in docs:
        doc["extraction"]["fields"] = {
            key: {"value": value} for key, value in doc["field_review"]["values"].items()
        }
        doc["field_review"] = None
    result = compare_documents(docs, allow_automatic=True)
    assert result["preliminary"] and result["reviewed_count"] == 0
    assert next(row for row in result["rows"] if row["field"] == "plot_number")["status"] == "match"


def test_plot_entries_are_compared_as_parts_not_raw_strings():
    docs = set_values(
        documents(), plot_number="১২০, ১২১"
    )
    docs[1]["field_review"]["values"]["plot_number"] = "121, 120"
    docs[2]["field_review"]["values"]["plot_number"] = "১২০ ও ১২১"
    assert statuses(docs)["plot_number"] == "match"

    docs[2]["field_review"]["values"]["plot_number"] = "১২০"
    result = rows(docs)["plot_number"]
    assert result["status"] == "partial_match"
    assert "আংশিক" in result["note"]

    docs[1]["field_review"]["values"]["plot_number"] = "১৩০"
    assert statuses(docs)["plot_number"] == "different"


def test_mouza_spacing_difference_is_reported_without_blocking_the_plot():
    docs = documents()
    docs[0]["field_review"]["values"]["mouza"] = "চর গোপাল"
    docs[1]["field_review"]["values"]["mouza"] = "চরগোপাল"
    docs[2]["field_review"]["values"]["mouza"] = "চর গোপাল"
    result = rows(docs)
    assert result["mouza"]["status"] == "format_differs"
    assert result["plot_number"]["status"] == "match"


def test_incomplete_value_names_the_document_that_lacks_it():
    docs = set_values(documents(), deed_number="দলিল-১")
    docs[0]["field_review"]["values"]["deed_number"] = ""
    row = rows(docs)["deed_number"]
    assert row["status"] == "incomplete"
    assert "দলিলে" in row["note"]
    assert row["missing_in"] == ["deed"]


def test_area_unit_mismatch_explains_that_no_conversion_was_made():
    docs = documents()
    docs[1]["field_review"]["values"]["area"] = "10 acres"
    assert "রূপান্তর" in rows(docs)["area"]["note"]


def test_summary_counts_every_row_and_reads_naturally():
    summary = compare_documents(documents())["summary"]
    assert summary["total"] == len(LABELS)
    assert summary["match"] == 5 and summary["missing"] == 6
    assert summary["sentence"].startswith("১১টি তথ্যের মধ্যে")
    assert "৫টি মিলেছে" in summary["sentence"]


def test_explanations_never_read_as_a_verdict():
    docs = set_values(documents(), owner_name="করিম", plot_number="১২০")
    docs[1]["field_review"]["values"]["plot_number"] = "১৩০"
    docs[2]["field_review"]["values"]["survey_type"] = "CS"
    text = " ".join(
        row["note"] for row in compare_documents(docs)["rows"]
    ) + compare_documents(docs)["summary"]["sentence"]
    for forbidden in ("জালিয়াতি", "বৈধ", "অবৈধ", "সনদ", "রায়", "নিশ্চিত"):
        assert forbidden not in text
