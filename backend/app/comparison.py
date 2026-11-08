"""Compare user-reviewed text values; never infer fraud, title or ownership."""

import re
import unicodedata
from collections import Counter
from decimal import Decimal

from app.field_extraction import LABELS, field_identity

KINDS = ("deed", "mutation", "khatian")
KIND_LABELS = {"deed": "দলিল", "mutation": "নামজারি", "khatian": "খতিয়ান"}
KIND_LOCATIVE = {"deed": "দলিলে", "mutation": "নামজারিতে", "khatian": "খতিয়ানে"}
REFERENCE_FIELDS = {
    "deed_number",
    "mutation_number",
    "khatian_number",
    "owner_name",
    "seller_name",
    "buyer_name",
}
CONTEXT_FIELDS = ("mouza", "jl_number", "survey_type")
CONTEXT_LABELS = {"mouza": "মৌজা", "jl_number": "জে.এল. নম্বর", "survey_type": "জরিপের ধরন"}
KNOWN_SURVEYS = {"cs", "sa", "rs", "bs", "সি এস", "এস এ", "আর এস", "বি এস"}
DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
ZERO_WIDTH = re.compile("[\u200b-\u200d\u2060\ufeff]")
SEPARATORS = re.compile(r"[\s,;।/&]+")
PLOT_CONJUNCTIONS = {"ও", "এবং", "and"}
TRIM = ".,;:।'\"“”()"


def normalize(value: str) -> str:
    # Preserve punctuation and leading zeroes: identifiers can depend on both.
    return " ".join(
        ZERO_WIDTH.sub("", unicodedata.normalize("NFC", value)).translate(DIGITS).casefold().split()
    )


def format_key(value: str) -> str:
    """Equality of meaning when only spacing and punctuation differ.

    Used only for context values (mouza), never to make identifiers equal.
    """
    return re.sub(r"[\s.,;:।'\"“”()\-]", "", normalize(value))


def unit_key(unit: str) -> str:
    text = re.sub(r"[\s.,;:।'\"“”()]", "", normalize(unit))
    return re.sub(r"s$", "", text) if text.isascii() else text


def plot_members(value: str) -> set[str]:
    """Split a dag entry into its parts without changing digits or leading zeroes."""
    text = field_identity("plot_number", value)
    members = {
        token.strip(TRIM) for token in SEPARATORS.split(text) if token.strip(TRIM)
    }
    return {member for member in members if member not in PLOT_CONJUNCTIONS}


def _short(value: str, limit: int = 40) -> str:
    text = " ".join(value.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _stated(raw: dict) -> str:
    return ", ".join(
        f"{KIND_LOCATIVE[kind]} «{_short(value)}»"
        for kind, value in raw.items()
        if (value or "").strip()
    )


def _kinds(values: list[str], locative: bool = False) -> str:
    names = (KIND_LOCATIVE if locative else KIND_LABELS)
    return ", ".join(names[kind] for kind in values)


def _bn(number: int) -> str:
    return str(number).translate(str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯"))


def _summary(rows: list[dict]) -> dict:
    counts = Counter(row["status"] for row in rows)
    cannot_compare = sum(
        counts[status]
        for status in ("context_required", "context_differs", "unsupported_survey", "unit_review")
    )
    pieces = [
        (counts["match"], "মিলেছে"),
        (counts["partial_match"], "আংশিক মিলেছে"),
        (counts["different"], "ভিন্ন"),
        (cannot_compare, "তুলনা করা যায়নি"),
        (counts["incomplete"], "তথ্য অসম্পূর্ণ"),
        (counts["missing"], "তথ্য পাওয়া যায়নি"),
        (counts["reference_only"], "শুধু পাশাপাশি দেখানো হয়েছে"),
        (counts["awaiting_review"], "এখনো যাচাই হয়নি"),
    ]
    sentence = " · ".join(f"{_bn(count)}টি {label}" for count, label in pieces if count)
    return {
        "total": len(rows),
        "match": counts["match"],
        "partial_match": counts["partial_match"],
        "different": counts["different"],
        "incomplete": counts["incomplete"],
        "missing": counts["missing"],
        "cannot_compare": cannot_compare,
        "reference_only": counts["reference_only"],
        "sentence": f"{_bn(len(rows))}টি তথ্যের মধ্যে {sentence}।"
        if sentence
        else "তুলনার জন্য যথেষ্ট তথ্য নেই।",
    }


def compare_documents(documents: list[dict], allow_automatic: bool = False) -> dict:
    by_kind = {d["document_type"]: d for d in documents}
    valid = {
        kind: bool(by_kind.get(kind, {}).get("field_review"))
        and by_kind[kind]["field_review"]["source_version"]
        == by_kind[kind]["extraction"]["version"]
        for kind in KINDS
    }
    reviewed = sum(valid.values())
    available = {kind: kind in by_kind and bool(by_kind[kind].get("extraction")) for kind in KINDS}

    def values(key):
        return {
            kind: by_kind[kind]["field_review"]["values"].get(key, "")
            if valid[kind]
            else by_kind[kind]["extraction"]["fields"].get(key, {}).get("value", "")
            if allow_automatic and available[kind]
            else None
            for kind in KINDS
        }

    def identity(key):
        raw = values(key)
        return raw, {kind: field_identity(key, raw[kind] or "") for kind in KINDS}

    context = {key: identity(key)[1] for key in CONTEXT_FIELDS}
    context_present = {
        key: all(bool(value) for value in row.values()) for key, row in context.items()
    }
    mouza_equal = len({format_key(value) for value in context["mouza"].values()}) == 1
    jl_equal = len(set(context["jl_number"].values())) == 1
    survey_equal = len(set(context["survey_type"].values())) == 1
    survey_known = all(value in KNOWN_SURVEYS for value in context["survey_type"].values())
    missing_context = [key for key, present in context_present.items() if not present]
    differing_context = [
        label
        for label, differs in (
            ("জরিপ", not survey_equal),
            ("মৌজা", not mouza_equal),
            ("জে.এল. নম্বর", not jl_equal),
        )
        if differs
    ]
    if missing_context:
        blocked = "context_required"
        labels = ", ".join(CONTEXT_LABELS[key] for key in missing_context)
        blocked_note = (
            f"তুলনার ভিত্তি অসম্পূর্ণ: {labels} পাওয়া যায়নি; "
            "তাই দাগ ও পরিমাণ তুলনা করা হয়নি।"
        )
    elif not survey_known:
        blocked = "unsupported_survey"
        blocked_note = "জরিপের ধরন (CS/SA/RS/BS) শনাক্ত করা যায়নি; দাগ ও পরিমাণ তুলনা করা হয়নি।"
    elif differing_context:
        blocked = "context_differs"
        blocked_note = (
            f"নথিভেদে {', '.join(differing_context)} আলাদা; একই জমি ধরে নিয়ে "
            "দাগ বা পরিমাণ তুলনা করা হয়নি।"
        )
    else:
        blocked = None
        blocked_note = ""

    rows = []
    for key in LABELS:
        raw, normalized = identity(key)
        present = {kind: bool(value) for kind, value in normalized.items()}
        compared = [kind for kind in KINDS if present[kind]]
        missing_in = [kind for kind in KINDS if not present[kind]]
        context_check = None
        if (not allow_automatic and reviewed != 3) or not all(available.values()):
            status = "awaiting_review"
            note = "তিনটি নথির পাঠ বা সংরক্ষিত যাচাই সম্পূর্ণ নয়; এখনই তুলনা করা যাচ্ছে না।"
        elif not compared:
            status = "missing"
            note = "তিনটি নথিতেই এই তথ্য পাওয়া যায়নি।"
        elif missing_in:
            status = "incomplete"
            note = f"{_kinds(missing_in, locative=True)} এই তথ্য নেই; অন্য নথিতে আছে — তুলনা অসম্পূর্ণ।"
        elif key in REFERENCE_FIELDS:
            status = "reference_only"
            note = (
                "নাম নথি ও ভূমিকা অনুযায়ী ভিন্ন হতে পারে; সমতা যাচাই করা হয় না।"
                if key.endswith("_name")
                else "প্রতিটি নথির নিজস্ব নম্বর; সমতা যাচাই করা হয় না।"
            )
        elif key in ("plot_number", "area"):
            context_check = {}
            for field in CONTEXT_FIELDS:
                if not context_present[field]:
                    context_check[field] = "missing"
                elif field == "mouza":
                    context_check[field] = "match" if mouza_equal else "different"
                else:
                    context_check[field] = (
                        "match" if len(set(context[field].values())) == 1 else "different"
                    )
            if blocked:
                status = blocked
                note = blocked_note
            elif key == "plot_number":
                members = {kind: plot_members(normalized[kind]) for kind in KINDS}
                union = set().union(*members.values())
                if all(member_set == union for member_set in members.values()):
                    status = "match"
                    note = "তিনটি নথিতেই একই দাগ নম্বর।"
                elif set.intersection(*members.values()):
                    status = "partial_match"
                    note = (
                        f"আংশিক মিল: {_stated(raw)}। কিছু দাগ মিলেছে, পূর্ণ তালিকা নয় — "
                        "অতিরিক্ত বা অনুপস্থিত দাগ মূল নথিতে দেখুন।"
                    )
                else:
                    status = "different"
                    note = f"দাগ নম্বর এক নয়: {_stated(raw)}। মূল নথি দেখে যাচাই করুন।"
            else:
                parsed = {}
                for kind, value in normalized.items():
                    match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)\s+(.+)", value)
                    parsed[kind] = (Decimal(match[1]), unit_key(match[2])) if match else None
                if not all(parsed.values()):
                    status = "unit_review"
                    unclear = [kind for kind, value in parsed.items() if value is None]
                    note = (
                        f"{_kinds(unclear, locative=True)} পরিমাণ বা একক স্পষ্টভাবে পড়া যায়নি; "
                        "রূপান্তর না করে তুলনা করা হয়নি।"
                    )
                elif len({unit for _, unit in parsed.values()}) != 1:
                    status = "unit_review"
                    note = f"একক ভিন্ন ({_stated(raw)}); রূপান্তর না করে তুলনা বন্ধ রাখা হয়েছে।"
                elif len({amount for amount, _ in parsed.values()}) == 1:
                    status = "match"
                    note = "তিনটি নথিতেই একই পরিমাণ ও একই একক।"
                else:
                    status = "different"
                    note = f"পরিমাণ এক নয়: {_stated(raw)}। মূল নথি দেখে যাচাই করুন।"
        else:
            distinct = set(normalized.values())
            if len(distinct) == 1:
                status = "match"
                note = "তিনটি নথিতেই মান এক।"
            elif key == "mouza" and len({format_key(value) for value in normalized.values()}) == 1:
                status = "format_differs"
                note = "একই মৌজা, তবে ফাঁকা জায়গা বা যতিচিহ্নে ভিন্ন।"
            else:
                status = "different"
                note = f"মান এক নয়: {_stated(raw)}। মূল নথি দেখে যাচাই করুন।"
        rows.append(
            {
                "field": key,
                "values": raw,
                "status": status,
                "note": note,
                "compared": compared,
                "missing_in": missing_in,
                "context_check": context_check,
                "preliminary": allow_automatic and reviewed != 3,
            }
        )
    summary = _summary(rows)
    return {
        "reviewed_count": reviewed,
        "preliminary": allow_automatic and reviewed != 3,
        "required_count": 3,
        "rows": rows,
        "summary": summary,
        "rule_version": "reviewed-comparison-v2",
        "risk_assessment_available": False,
        "documents": [
            {
                "document_type": kind,
                "id": by_kind.get(kind, {}).get("id"),
                "reviewed_at": by_kind.get(kind, {}).get("field_reviewed_at"),
                "current_review": valid[kind],
            }
            for kind in KINDS
        ],
    }
