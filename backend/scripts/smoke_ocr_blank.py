"""A blank document must produce a review warning, never invented text."""

import io

from PIL import Image

from app.ocr_engine import extract

buffer = io.BytesIO()
Image.new("RGB", (1200, 1200), "white").save(buffer, format="PNG")
result = extract(buffer.getvalue(), "image/png", 1)
assert result["pages"][0]["text"] == ""
assert result["pages"][0]["warning"] == "no_text"
assert result["pages"][0]["confidence"] is None
print("PASS: blank page requires review and contains no invented text")
