BEGIN;
SELECT pg_advisory_xact_lock(610018);
ALTER TABLE document_ocr ADD COLUMN field_review bytea;
ALTER TABLE document_ocr ADD COLUMN field_reviewed_at timestamptz;
INSERT INTO schema_versions(version) VALUES (4);
COMMIT;
