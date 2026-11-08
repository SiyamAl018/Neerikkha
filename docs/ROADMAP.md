# Neerikkha phased build

## Current milestone — reviewed document comparison baseline
Side-by-side comparison uses only current saved reviews. Missing data, differing values,
survey context and area-unit limitations are separate states. No fraud or title decision.
See COMPARISON.md and HANDOFF.md. Next: evidence-linked review checklist.

## Completed milestone — structured field review baseline
Labelled-line suggestions with original page/line evidence, conflicts and missing-value
states, encrypted manual field review, ownership controls and stale-update rejection are
implemented and integration-tested. See HANDOFF.md for live milestone handoffs.
Next: comparison of reviewed values across the three documents. Real-data accuracy remains unmeasured.

## Completed milestone — local Tesseract OCR baseline
Bangla/English Tesseract OCR and per-document text correction are implemented locally.
See OCR.md. Dataset accuracy benchmarking and structured field extraction are next;
this does not complete the full OCR/data phase or implement risk analysis.

## Completed milestone — three-document uploads
Local upload milestone implemented and integration-tested: deed, mutation and khatian,
content validation, encrypted private storage, owner downloads, replacements and deletion API.
See UPLOADS.md. Next: OCR and extracted-field review. Identity phase still needs restricted
admin provisioning/MFA. The live account UI is Bangla; the bilingual design preview is separate.

## F1 — Frontend design preview (available at /demo)
Dashboard, Bangla/English interface, case search/filter, in-memory draft creation, three-file selection, illustrative report, responsive layout and getting-started guide.
Acceptance: TypeScript/build pass; browser checks for switching language, filtering, creating a draft, file validation and selection; desktop/mobile review.
Limits: not a production system; no accounts, durable storage, real uploads, OCR or generated findings.

## Next milestones
Current backend status: the foundation milestone is complete. The full Docker stack starts healthy, the API verifies all four dependencies, the queue worker consumes a smoke job, and the distinct three-document contract is tested. See VERIFICATION.md for measured results.

1. Foundation (plan Phase 0): complete locally — backend skeleton, Docker services, health checks, CI definition and reproducible setup. Remote CI awaits a GitHub repository.
2. Identity and storage (Phase 1): database migrations, authentication, owner access controls, restricted administrator provisioning and audit.
3. Real case workflow (Phase 2): authenticated grouped uploads, content validation, encrypted storage and deletion.
4. OCR and data (Phases 3–5): preprocessing, baseline benchmark, labelled data, fine-tuning decision gate, extraction and manual verification.
5. Deterministic checks (Phase 6): survey-aware matching, ownership/area checks, mutation gaps, duplicate indicators and source traceability.
6. Grounded explanations (Phase 7): reviewer-approved sources, citation verification, privacy protection and fallback wording.
7. Integrated interface (Phase 8): real status, correction screen, three-office comparison, role-specific reports and Bengali PDF export.
8. Evaluation and delivery (Phase 9): end-to-end/security tests, measured accuracy, deployment and capstone demo.
9. Prioritised additions: verified legal assistant and selected CRM modules after core workflow.

## User inputs needed later
- Feedback on F1 appearance and terminology.
- A private GitHub repository and team ownership preferences for contribution tracking.
- Anonymised deed, khatian and mutation samples with permission to use them, and expected field labels. Do not commit originals.
- A domain reviewer for rule-to-clause mapping and local area conversion rules.
- Hosting/account choices when deploying. Secrets go through environment configuration, never source files or chat.

Report completion and verification limits at every milestone. Do not label backend phases complete based on the frontend preview.
