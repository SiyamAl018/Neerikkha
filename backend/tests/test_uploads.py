import io
import os

import pytest
from cryptography.exceptions import InvalidTag
from PIL import Image
from pypdf import PdfWriter

from app.file_validation import InvalidFile, validate_file
from app.storage import decrypt, encrypt


def test_image_and_invalid_contents():
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32)).save(buffer, format="PNG")
    result = validate_file(buffer.getvalue())
    assert result.content_type == "image/png"
    assert result.warnings == ["low_resolution"]
    for data in [b"", b"MZfake executable", b"%PDF-broken"]:
        with pytest.raises(InvalidFile):
            validate_file(data)


def test_pdf_limits_and_password():
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buffer = io.BytesIO()
    writer.write(buffer)
    assert validate_file(buffer.getvalue()).pages == 1
    for _ in range(10):
        writer.add_blank_page(width=100, height=100)
    buffer = io.BytesIO()
    writer.write(buffer)
    with pytest.raises(InvalidFile, match="page_limit"):
        validate_file(buffer.getvalue())
    writer.encrypt("example")
    buffer = io.BytesIO()
    writer.write(buffer)
    with pytest.raises(InvalidFile, match="encrypted_pdf"):
        validate_file(buffer.getvalue())


def test_encryption_binds_document_and_detects_tampering():
    key = os.urandom(32)
    encrypted = encrypt(b"synthetic document", key, "case/document")
    assert b"synthetic document" not in encrypted
    assert encrypted != encrypt(b"synthetic document", key, "case/document")
    assert decrypt(encrypted, key, "case/document") == b"synthetic document"
    for data, secret, path in [
        (encrypted, os.urandom(32), "case/document"),
        (encrypted, key, "other/document"),
        (encrypted[:-1] + bytes([encrypted[-1] ^ 1]), key, "case/document"),
    ]:
        with pytest.raises(InvalidTag):
            decrypt(data, secret, path)
