# Database milestone

Initial schema includes users, cases, documents, revocable sessions and audit events. This is the first database increment; login endpoints and server-side ownership authorization are not implemented yet.

Apply the transactional migration from the repository root:

```powershell
Get-Content -Raw backend/migrations/001_identity_cases.sql | docker compose exec -T postgres psql -U neerikkha -d neerikkha -v ON_ERROR_STOP=1
Get-Content -Raw backend/tests/schema_smoke.sql | docker compose exec -T postgres psql -U neerikkha -d neerikkha
```

The smoke test uses synthetic rows inside a rolled-back transaction. Migration 001 is repeatable for initial setup. Future schema changes must use new numbered migrations; editing an applied definition does not upgrade an existing table.

Constraints enforce case ownership references, case-insensitive unique emails, one super-administrator identity, recognised survey/document types, and one active document per type per case. These constraints do not replace API authorization. Authentication, password hashing, admin provisioning and session checks must be completed before accepting real user data.
