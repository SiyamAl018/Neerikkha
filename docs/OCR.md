# Document reading

Gemini is the primary reader and receives each complete document in one HTTPS request. Tesseract is an optional printed-text fallback. See [Gemini setup](GEMINI.md). Documents are sent to Google when Gemini is selected. The following rasterisation details apply only to Tesseract.

PDF pages are rasterised with Poppler, capped at 3000 pixels on the long side.
Images receive EXIF orientation correction, size limiting and grayscale contrast adjustment.
Tesseract automatic page segmentation produces page text and mean word confidence.
Confidence is an engine diagnostic, not a measured probability of correctness.
Blank pages and low confidence pages are flagged. Original downloads remain available.

OCR results and user corrections are encrypted in PostgreSQL with the local document key.
Queue messages contain IDs only. Private temporary files are removed after processing.
Each subprocess has a timeout; hybrid jobs have a four-hour limit. A queued/processing case
older than four hours can be submitted again through the start endpoint. Run IDs prevent
old jobs from overwriting newer results. Replacing any document clears the case's OCR
results and reviews, and requires confirmation and OCR again. Case deletion cascades
to encrypted text results as well as removing the stored source files.

This is a printed-text baseline, not a validated handwriting recogniser. There is no
general narrative field extraction, cross-document comparison, fraud decision,
or legal interpretation yet. Label-based field suggestions and encrypted field review are
now available; see HANDOFF.md. Saving a review records the user's transcription; it does
not certify the source document. Real Bangla accuracy remains unmeasured pending permitted,
anonymised documents and manually checked reference transcriptions.

Engine references: [Tesseract CLI](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html)
and [Poppler pdftoppm](https://manpages.debian.org/experimental/poppler-utils/pdftoppm.1.en.html).

## Verification commands

```powershell
docker compose up -d --build --wait
docker compose exec -T worker tesseract --list-langs
docker compose exec -T api python scripts/smoke_uploads.py
```

The integration check creates synthetic text images, uploads all three document types,
waits for the actual worker, checks recognised text, saves owner corrections, checks
foreign-owner denial and encrypted result storage, then verifies replacement invalidation
and deletes its fixtures. It is a plumbing check, not an OCR accuracy benchmark.

Verified locally on 2026-11-06: 18 unit tests, Ruff checks and frontend production build
passed. The running web/API/worker integration passed with two image documents and a
two-page PDF. Actual recognition, encrypted corrections, ownership isolation and
replacement invalidation passed. A separate actual Tesseract run on a blank image
returned no text with a review warning. Installed language data: ben, eng, osd.
