from app.ocr_engine import parse_tsv


def test_ocr_preserves_lines_and_bangla_and_flags_uncertainty():
    header = "level\tblock_num\tpar_num\tline_num\tconf\ttext\n"
    result = parse_tsv(
        header + "5\t1\t1\t1\t80\tখতিয়ান\n5\t1\t1\t1\t40\t১২৩\n5\t1\t1\t2\t60\tমৌজা\n", 2
    )
    assert result["text"] == "খতিয়ান ১২৩\nমৌজা"
    assert result["page"] == 2
    assert result["confidence"] == 60
    assert result["warning"] == "low_confidence"


def test_blank_page_is_not_successful_recognition():
    result = parse_tsv("level\ttext\n1\t\n", 1)
    assert result["text"] == ""
    assert result["confidence"] is None
    assert result["warning"] == "no_text"
