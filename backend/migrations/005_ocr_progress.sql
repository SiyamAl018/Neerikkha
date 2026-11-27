BEGIN;
SELECT pg_advisory_xact_lock(610018);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS ocr_progress jsonb;
INSERT INTO schema_versions(version) VALUES (5) ON CONFLICT DO NOTHING;
COMMIT;
