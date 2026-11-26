import io
import warnings
from dataclasses import dataclass

from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 30_000_000


@dataclass
class ValidatedFile:
    content_type: str
    pages: int
    warnings: list[str]


class InvalidFile(ValueError):
    pass


def validate_file(data: bytes) -> ValidatedFile:
    if not data or len(data) > MAX_BYTES:
        raise InvalidFile("file_size")
    if data.startswith(b"%PDF-"):
        try:
            reader = PdfReader(io.BytesIO(data), strict=True)
            if reader.is_encrypted:
                raise InvalidFile("encrypted_pdf")
            count = len(reader.pages)
            if not 1 <= count <= 10:
                raise InvalidFile("page_limit")
            # Do not accept PDF portfolios, scripts or automatic actions in this pilot.
            root = reader.trailer["/Root"]
            if "/OpenAction" in root or "/AA" in root or "/Names" in root:
                raise InvalidFile("active_pdf")
            for page in reader.pages:
                if "/AA" in page:
                    raise InvalidFile("active_pdf")
            return ValidatedFile("application/pdf", count, [])
        except InvalidFile:
            raise
        except Exception:
            raise InvalidFile("invalid_file") from None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in ("PNG", "JPEG"):
                    raise InvalidFile("invalid_file")
                if image.width * image.height > MAX_PIXELS:
                    raise InvalidFile("image_dimensions")
                if getattr(image, "n_frames", 1) != 1:
                    raise InvalidFile("invalid_file")
                mime = "image/png" if image.format == "PNG" else "image/jpeg"
                low_resolution = min(image.size) < 1000
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                image.load()
            return ValidatedFile(mime, 1, ["low_resolution"] if low_resolution else [])
    except InvalidFile:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombWarning,
        Image.DecompressionBombError,
    ):
        raise InvalidFile("invalid_file") from None
