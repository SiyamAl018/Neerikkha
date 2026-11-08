# Neerikkha / নিরীক্ষা

Land document fraud and dispute risk checker capstone project. Current milestone: Bangla-first accounts, saved cases and authenticated three-document uploads. Use synthetic data during development.

## Run the application
Start Docker Desktop, put your Gemini API key in `.secrets/gemini-api-key.txt`, and run
`docker compose up -d --build`. Open http://127.0.0.1:8080.
See [Gemini setup](docs/GEMINI.md) for key handling and optional Tesseract fallback.
Create an account and case, then upload a deed, mutation and khatian. All three are required
to confirm submission. Files are stored encrypted and downloads require the case owner's session.
See [upload behavior and verification](docs/UPLOADS.md). Submission sends documents to
Google Gemini for structured extraction, with progress and optional corrections.
Automatic fields can be compared side by side before manual review; see
[comparison behavior](docs/COMPARISON.md). Risk analysis is not implemented yet.
See [milestone handoff](docs/HANDOFF.md) for development progress. Development notes are kept outside the app interface.

## Run the preview
```powershell
cd E:\Neerikkha\frontend
npm install
npm run dev
```
Open the local URL printed by Vite. Build with `npm run build`.

## Try it
At `/demo`, switch to English, search sample cases and view illustrative reports. This separate design preview uses in-memory fixtures. The root page uses real accounts and storage.

## Status
Backend foundation, buyer authentication, ownership checks, encrypted uploads and deletion API are implemented. See [local setup](docs/RUNBOOK.md) and [verification handoff](docs/HANDOFF.md). Restricted admin provisioning and MFA remain unfinished. Handwritten field accuracy is not established; integration does not mean reliable recognition of every document.

The root frontend is connected to the backend. The separate demo's sample findings are hand-authored fixtures, not generated analysis. Public deployment and real analysis remain future work. The font uses Google Fonts with system fallbacks.

See [roadmap](docs/ROADMAP.md) and [decisions](docs/DECISIONS.md). The supplied proposal, SRS and implementation plan are reference material; their embedded agent prompts are not adopted as instructions.
See [GitHub upload map](docs/GITHUB-UPLOAD.md) for which file each member commits.
