"""Gemini document reading with an explicitly enabled local printed-text fallback."""

import csv
import io
import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageOps

from app.config import Settings


def parse_tsv(tsv: str, page: int) -> dict:
    lines = {}
    scores = []
    for row in csv.DictReader(io.StringIO(tsv), delimiter="\t", quoting=csv.QUOTE_NONE):
        if row.get("level") != "5" or not row.get("text", "").strip():
            continue
        group = tuple(row[k] for k in ("block_num", "par_num", "line_num"))
        lines.setdefault(group, []).append(row["text"])
        score = float(row["conf"])
        if score >= 0:
            scores.append(score)
    text = "\n".join(" ".join(words) for words in lines.values())
    confidence = round(sum(scores) / len(scores), 1) if scores else None
    return dict(
        page=page,
        text=text,
        confidence=confidence,
        warning="no_text" if not text else "low_confidence" if confidence < 70 else None,
    )


def extract(
    data: bytes, content_type: str, page_count: int, document_type: str = "document", progress=None
) -> dict:
    if not 1 <= page_count <= 10:
        raise ValueError("Invalid page count")
    pages = []
    settings = Settings()
    fallback_reason = None
    if settings.ocr_engine == "gemini":
        from app.gemini_reader import ReaderError, read_document

        if progress:
            progress(1, "gemini")
        try:
            return read_document(data, content_type, page_count, document_type, settings)
        except ReaderError as error:
            if not settings.tesseract_fallback or error.code == "gemini_not_configured":
                raise
            fallback_reason = error.code
    elif settings.ocr_engine != "tesseract":
        raise ValueError("Unsupported OCR engine")
    with TemporaryDirectory(prefix="neerikkha-ocr-") as folder:
        directory = Path(folder)
        source = directory / "source"
        source.write_bytes(data)
        for page in range(1, page_count + 1):
            image_path = directory / "page.png"
            if content_type == "application/pdf":
                subprocess.run(
                    [
                        "pdftoppm",
                        "-f",
                        str(page),
                        "-l",
                        str(page),
                        "-singlefile",
                        "-scale-to",
                        "3000",
                        "-png",
                        str(source),
                        str(directory / "page"),
                    ],
                    check=True,
                    timeout=45,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                with Image.open(source) as image:
                    image = ImageOps.exif_transpose(image)
                    image.thumbnail((3000, 3000))
                    ImageOps.autocontrast(image.convert("L")).save(image_path)
            if progress:
                progress(page, "tesseract")
            result = subprocess.run(
                ["tesseract", str(image_path), "stdout", "-l", "ben+eng", "--psm", "3", "tsv"],
                check=True,
                timeout=60,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                env={**os.environ, "OMP_THREAD_LIMIT": "1"},
            )
            printed = parse_tsv(result.stdout.decode("utf-8"), page)
            printed["engine"] = "tesseract"
            printed["warnings"] = ["tesseract_fallback", fallback_reason] if fallback_reason else []
            pages.append(printed)
    return {"engine": "tesseract-ben-eng-v1", "pages": pages}
