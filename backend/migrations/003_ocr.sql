BEGIN;
SELECT pg_advisory_xact_lock(610018);
ALTER TABLE cases ADD COLUMN ocr_run_id uuid;
ALTER TABLE cases ADD COLUMN ocr_started_at timestamptz;
CREATE TABLE document_ocr (
 document_id uuid PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
 result bytea NOT NULL,
 reviewed_text bytea,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_versions(version) VALUES (3);
COMMIT;
