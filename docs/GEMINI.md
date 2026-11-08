# Gemini document reader

Gemini is primary. Tesseract is an optional local printed-text fallback. Qwen/Orus
weights and native runtimes have been removed; no local vision model is needed.

## Configure

Create a Gemini API key in Google AI Studio and put only the key, without quotes, in
`E:\Neerikkha\.secrets\gemini-api-key.txt`. This ignored file is mounted read-only
into API/worker containers. Never put it in frontend variables or chat. Use a
billing-enabled project for personal documents under Google's paid-service data terms.
The user explicitly switched from local-only processing to Gemini cloud processing.

Start Docker Desktop, then `docker compose up -d --build`. Open http://127.0.0.1:8080.
After entering the key, refresh case status. If your editor replaces the key file
instead of saving in place, recreate its mounts with
`docker compose up -d --force-recreate api worker`.

Root `.env` options (see `.env.example`):
- `OCR_ENGINE=gemini`
- `GEMINI_MODEL=gemini-3.5-flash` (must be available to your API project)
- `TESSERACT_FALLBACK=false` (set true to allow printed-text fallback on API failure)

A missing key always blocks Gemini processing, even if fallback is enabled. To
deliberately run only local printed-text OCR, set `OCR_ENGINE=tesseract`.

## Processing and limits

Each entire document is sent inline via HTTPS to Google's GenerateContent API, once
per pass (two independent passes by default). There are no per-page model calls and
no Files API uploads. This does
not mean Google performs no data processing or retention: its service terms apply.
There are no automatic paid retries.

The bounded JSON response includes source page numbers, fields and supporting text.
These are excerpts, not a complete transcription. Missing pages or malformed output
fail explicitly. Uncertain values or values absent from their quoted evidence are not
auto-selected. Conflicts stay visible. These checks cannot establish model accuracy.
The UI labels comparisons as preliminary and manual corrections remain optional.

## Extraction selection update — 7 November 2026

The same 11 public fields are retained. Gemini now classifies supporting readings as
primary, historical, component or unclear. Historical references and component shares
remain in the evidence but cannot replace a primary value. Explicit simultaneous
parties/plots/khatians can populate a semicolon-separated value; alternative readings
still conflict, and an uncertain list member prevents publishing a partial list.

Area comparisons recognize redundant written amounts and decimal formatting without
converting units or adding shares. Survey abbreviations tolerate dots, commas and
spacing. Identifier leading zeroes remain significant. Evidence matching requires word
boundaries, so a shorter number cannot be accepted from inside a different number.
Existing saved results retain their original evidence; new scope metadata requires
reprocessing. Saved manual corrections continue to take precedence.

This version still sends one request per document. No extra close-up/model pass is
enabled. These changes address selection errors, not a guarantee of handwritten-digit
accuracy. Provider availability is a separate failure condition.

Missing/rejected keys, model access, quota limits, timeouts and invalid outputs have
explicit error codes. Raw provider errors, keys and document contents are not logged.
Tesseract fallback is labelled and cannot reliably read handwritten Bangla.

## Multi-pass reading and repairs — 8 November 2026

Each document is read twice by default (`GEMINI_PASSES=2`, allowed 1–3), as independent
requests returning the same strict schema. Reconciliation is deterministic code:

- A value both passes return is confirmed and carries higher reliability.
- Values that differ between passes are never averaged or majority-voted; they appear as
a conflict and no value is published.
- A value only one pass returned is kept, marked partial agreement, its reliability is
capped and it needs manual confirmation.
- A failed later pass keeps the first reading and adds an explicit warning; a failed
first pass still fails the document.

Values are cleaned only in visible, recorded ways: a leading label followed by a
separator (`দাগ নং: ০০১২` → `০০১২`) and surrounding punctuation. Each change is returned
as a repair record containing the original text. A value whose digits differ from its
quoted evidence is never substituted; thousands separators and area/survey formatting
can only match their evidence as `format`.

Reliability is a deterministic score built from evidence matching, model uncertainty
and cross-pass agreement. It is not a measured accuracy percentage and must not be
reported as one. Two passes double Gemini latency and quota use; set `GEMINI_PASSES=1`
to restore single-pass behaviour.

## Verification

61 backend tests passed, including simulated Gemini responses for request shape, key
handling, page coverage, uncertain fields and sanitised errors. On 7 November 2026,
the supplied key passed Google's model-list request and a real khatian extraction
completed in 33.7 seconds. A separate application test uploaded the complete Set 1
deed (10 pages), mutation (1 page), and khatian (1 page). All 12 pages completed through
queue, Gemini, encrypted storage, field extraction and preliminary comparison in
157.1 seconds without fallback warnings. Nonempty automatic fields: deed 4, mutation 5,
khatian 4. These counts measure extraction availability, not correctness. Exact field
accuracy has not been established and complete recognition is not claimed.

References: https://ai.google.dev/api/generate-content and
https://ai.google.dev/gemini-api/terms.

