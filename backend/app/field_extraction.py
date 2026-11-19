"""Conservative labelled-line suggestions, never inferred ownership or legal findings."""

import hashlib
import json
import re
import unicodedata
from decimal import Decimal

LABELS = {
    "mouza": ("মৌজা", "মৌজার নাম", "mouza"),
    "jl_number": ("জে এল নং", "জে.এল. নং", "জেএল নম্বর", "jl number", "jl no"),
    "plot_number": ("দাগ নং", "দাগ নম্বর", "বর্তমান দাগ", "দাগ/প্লট নং", "plot number", "plot no", "plot"),
    "khatian_number": ("খতিয়ান নং", "খতিয়ান নং", "খতিয়ান নম্বর", "khatian number", "khatian no"),
    "deed_number": ("দলিল নং", "দলিল নম্বর", "deed number", "deed no"),
    "mutation_number": ("নামজারি নং", "নামজারি নম্বর", "mutation number", "mutation no"),
    "owner_name": ("মালিকের নাম", "owner name"),
    "seller_name": ("বিক্রেতার নাম", "seller name"),
    "buyer_name": ("ক্রেতার নাম", "buyer name"),
    "area": ("জমির পরিমাণ", "মোট জমি", "land area", "area"),
    "survey_type": ("জরিপের ধরন", "survey type"),
}
PATTERNS = {
    key: re.compile(
        r"^\s*(?:"
        + "|".join(re.escape(unicodedata.normalize("NFC", label)) for label in labels)
        + r")(?:\s*[:：]\s*|\s+)(.+?)\s*$",
        re.IGNORECASE,
    )
    for key, labels in LABELS.items()
}


def canonical(value: str) -> str:
    return " ".join(
        unicodedata.normalize("NFC", value)
        .translate(str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))
        .casefold()
        .split()
    )


def field_identity(key: str, value: str) -> str:
    """Normalize only unambiguous formatting, never identifier digits or units."""
    value = canonical(value)
    if key == "survey_type":
        compact = re.sub(r"[\s.,।]", "", value)
        return {"সিএস": "cs", "এসএ": "sa", "আরএস": "rs", "বিএস": "bs"}.get(
            compact, compact if compact in {"cs", "sa", "rs", "bs"} else value
        )
    if key == "area":
        # Parentheses may repeat the amount in words, but never discard another number.
        plain = re.sub(r"\([^()0-9]*\)", "", value).strip("= ")
        match = re.fullmatch(
            r"(\d+(?:\.\d+)?)\s*(শতক|শতাংশ|একর|অযুতাংশ|ডেসিমেল|বিঘা|কাঠা|বর্গফুট|acres?|decimals?|sq ft)",
            plain,
        )
        if not match:
            match = re.fullmatch(
                r"(\d+(?:\.\d+)?)\s*\([^()0-9]*?\s+(শতক|শতাংশ|একর|অযুতাংশ|ডেসিমেল|বিঘা|কাঠা)\)",
                value.strip("= "),
            )
        if match:
            return f"{Decimal(match[1]).normalize():f} {match[2]}"
    return value


def grounded(value: str, readings: list[dict]) -> bool:
    """Require an independent OCR reading before publishing a vision-only value."""
    needle = canonical(value)
    return any(
        re.search(r"(?<!\w)" + re.escape(needle) + r"(?!\w)", canonical(reading["text"]))
        for reading in readings
    )


def layout_candidates(page: dict, key: str) -> list[dict]:
    """Associate table headings with nearby OCR boxes, without filling absent cells."""
    anchors = {
        "plot_number": ("বর্তমান দাগ", "দাগ/প্লট নং"),
        "area": ("মোট জমি",),
        "mouza": ("মৌজা",),
        "jl_number": ("জে.এল.", "জে এল নং"),
    }
    if key not in anchors:
        return []
    lines = page.get("lines", [])
    result = []
    for heading in lines:
        title = heading["text"].strip().rstrip(":：")
        if title not in anchors[key]:
            continue
        x1, y1, x2, y2 = heading["bbox"]
        height = max(y2 - y1, 10)
        possible = []
        for number, line in enumerate(lines, 1):
            if line is heading:
                continue
            a, b, c, d = line["bbox"]
            below = y2 - height * 0.1 < b < y2 + height * 12 and a < x2 and c > x1
            right = x2 <= a < x2 + height * 12 and abs((b + d - y1 - y2) / 2) < height
            value = line["text"].strip()
            if not (below or right) or not value or len(value) > 100:
                continue
            if key in ("plot_number", "jl_number") and not re.fullmatch(
                r"[0-9০-৯][0-9০-৯\s,/.-]*", value
            ):
                continue
            if key == "area" and not re.fullmatch(
                r"[0-9০-৯]+(?:[.,][0-9০-৯]+)?\s*"
                r"(?:শতক|শতাংশ|একর|অযুতাংশ|ডেসিমেল|বিঘা|কাঠা|বর্গফুট|acres?|decimals?|sq ft)",
                value,
                re.IGNORECASE,
            ):
                continue
            distance = (b - y2) if below else (a - x2)
            possible.append((distance, number, line))
        if possible:
            _, number, line = min(possible, key=lambda item: item[0])
            result.append(
                {
                    "value": line["text"].strip(),
                    "page": page["page"],
                    "line": number,
                    "source_text": heading["text"] + " → " + line["text"],
                    "bbox": line["bbox"],
                    "confidence": line.get("confidence"),
                    "method": "layout",
                    "needs_review": True,
                }
            )
    return result


def suggest_fields(pages: list[dict], reviewed_text: str | None) -> dict:
    # Include all source pages and transcription in the version, even if no label matches.
    source = json.dumps([pages, reviewed_text], ensure_ascii=False, sort_keys=True)
    version = hashlib.sha256(source.encode()).hexdigest()
    sources = [{"page": None, "text": reviewed_text}] if reviewed_text is not None else pages
    total_passes = max(
        (page.get("passes", 1) for page in pages if isinstance(page, dict)), default=1
    )
    fields = {}
    for key, pattern in PATTERNS.items():
        candidates = []
        for page in sources:
            if reviewed_text is None and "structured_fields" in page:
                candidates.extend(c for c in page["structured_fields"] if c["field"] == key)
                continue
            readings = page.get("readings", [page]) if reviewed_text is None else [page]
            for reading in readings:
                lines = (
                    [line["text"] for line in reading["lines"]]
                    if reading.get("lines")
                    else reading["text"].splitlines()
                )
                for number, line in enumerate(lines, 1):
                    match = pattern.fullmatch(unicodedata.normalize("NFC", line))
                    if match:
                        candidates.append(
                            {
                                "value": match[1],
                                "page": page["page"],
                                "line": number,
                                "source_text": line,
                                "method": "label",
                                "engine": reading.get("engine", "ocr"),
                                "needs_review": reviewed_text is None,
                            }
                        )
                if reviewed_text is None:
                    candidates.extend(
                        {**candidate, "engine": reading.get("engine", "ocr")}
                        for candidate in layout_candidates(reading, key)
                    )
            if reviewed_text is None and page.get("vision_fields", {}).get(key):
                value = page["vision_fields"][key]
                supported = grounded(value, readings)
                if key.endswith("_number"):
                    # A table's column index is not a land record identifier.
                    supported = any(
                        c["page"] == page["page"] and canonical(c["value"]) == canonical(value)
                        for c in candidates
                    )
                elif key in {"mouza", "owner_name", "seller_name", "buyer_name"}:
                    supported = supported and any(char.isalpha() for char in value)
                elif key == "area":
                    supported = (
                        supported
                        and any(char.isdigit() for char in value)
                        and any(char.isalpha() for char in value)
                    )
                elif key == "survey_type":
                    supported = supported and canonical(value) in {
                        "cs",
                        "sa",
                        "rs",
                        "bs",
                        "সি এস",
                        "এস এ",
                        "আর এস",
                        "বি এস",
                    }
                candidates.append(
                    {
                        "value": value,
                        "page": page["page"],
                        "line": None,
                        "source_text": value,
                        "method": "vision",
                        "engine": "qwen3-vl",
                        "needs_review": True,
                        "grounded": supported,
                    }
                )
        # Equivalent Bengali/ASCII digits agree; never discard a different reading by voting.
        unique = {}
        eligible = []
        for candidate in candidates:
            if candidate.get("grounded") is False or candidate.get("scope", "primary") != "primary":
                continue
            eligible.append(candidate)
            normalized = field_identity(key, candidate["value"])
            unique.setdefault(normalized, candidate["value"])
        values = list(unique.values())
        uncertain_member = any(
            c.get("scope", "primary") == "primary"
            and c.get("multiple") is True
            and c.get("grounded") is False
            for c in candidates
        )
        multiple = (
            key in {"plot_number", "khatian_number", "owner_name", "seller_name", "buyer_name"}
            and bool(eligible)
            and all(c.get("multiple") is True for c in eligible)
        )
        resolved = (len(values) == 1 or (len(values) > 1 and multiple)) and not uncertain_member
        contributing = (
            [c for c in eligible if field_identity(key, c["value"]) in unique] if resolved else []
        )
        pass_count = len({c["pass"] for c in contributing if "pass" in c})
        agreement = (
            "confirmed"
            if total_passes > 1 and pass_count >= total_passes
            else "partial"
            if total_passes > 1 and pass_count
            else "single"
        )
        # Only engines that report a score contribute one; label rules stay unscored.
        candidates_with_scores = contributing or eligible
        scores = [
            c["confidence"]
            for c in candidates_with_scores
            if isinstance(c.get("confidence"), (int, float))
        ]
        confidence = round(min(scores), 2) if scores else None
        if confidence is not None and agreement == "partial":
            confidence = round(min(confidence, 0.6), 2)
        if not resolved and scores:
            confidence = 0.0
        fields[key] = {
            "value": "; ".join(values) if resolved else "",
            "status": ("uncertain" if candidates else "missing")
            if not values
            else "suggested"
            if resolved
            else "conflict",
            "needs_review": reviewed_text is None or not resolved or agreement == "partial",
            "confidence": confidence,
            "agreement": agreement,
            "passes": total_passes,
            "candidates": candidates,
        }
    return {
        "version": version,
        "source": "reviewed_text" if reviewed_text is not None else "ocr",
        "fields": fields,
    }
